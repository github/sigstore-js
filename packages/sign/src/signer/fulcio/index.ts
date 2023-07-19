/*
Copyright 2023 The Sigstore Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { InternalError } from '../../error';
import { oidc } from '../../util';
import { CA, CAClient } from './ca';
import { EphemeralSigner } from './ephemeral';

import type { IdentityProvider } from '../../identity';
import type { Signature, Signer } from '../signer';

export interface FulcioSignerOptions {
  fulcioBaseURL: string;
  identityProvider: IdentityProvider;
  keyHolder?: Signer;
}

// Signer implementation which can be used to decorate another signer
// with a Fulcio-issued signing certificate for the signer's public key.
// Must be instantiated with an identity provider which can provide a JWT
// which represents the identity to be bound to the signing certificate.
export class FulcioSigner implements Signer {
  private ca: CA;
  private identityProvider: IdentityProvider;
  private keyHolder: Signer;

  constructor(options: FulcioSignerOptions) {
    this.ca = new CAClient(options);
    this.identityProvider = options.identityProvider;
    this.keyHolder = options.keyHolder || new EphemeralSigner();
  }

  public async sign(data: Buffer): Promise<Signature> {
    // Retrieve identity token from the supplied identity provider
    const identityToken = await this.getIdentityToken();

    // Extract challenge claim from OIDC token
    const subject = oidc.extractJWTSubject(identityToken);

    // Construct challenge value by signing the subject claim
    const challenge = await this.keyHolder.sign(Buffer.from(subject));

    if (challenge.key.$case !== 'publicKey') {
      throw new InternalError({
        code: 'CA_CREATE_SIGNING_CERTIFICATE_ERROR',
        message: 'unexpected format for signing key',
      });
    }

    // Create signing certificate
    const certificates = await this.ca.createSigningCertificate(
      identityToken,
      challenge.key.publicKey,
      challenge.signature
    );

    // Generate artifact signature
    const signature = await this.keyHolder.sign(data);

    // Specifically returning only the first certificate in the chain
    // as the key.
    return {
      signature: signature.signature,
      key: {
        $case: 'x509Certificate',
        certificate: certificates[0],
      },
    };
  }

  private async getIdentityToken(): Promise<string> {
    try {
      return await this.identityProvider.getToken();
    } catch (err) {
      throw new InternalError({
        code: 'IDENTITY_TOKEN_READ_ERROR',
        message: 'error retrieving identity token',
        cause: err,
      });
    }
  }
}
