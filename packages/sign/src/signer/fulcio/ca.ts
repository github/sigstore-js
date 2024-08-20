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
import { internalError } from '../../error';
import { Fulcio, SigningCertificateRequest } from '../../external/fulcio';

import type { FetchOptions } from '../../types/fetch';

export interface CA {
  createSigningCertificate: (
    identityToken: string,
    publicKey: string,
    challenge: Buffer
  ) => Promise<string[]>;
}

export type CAClientOptions = {
  fulcioBaseURL: string;
} & FetchOptions;

export class CAClient implements CA {
  private fulcio: Fulcio;

  constructor(options: CAClientOptions) {
    this.fulcio = new Fulcio({
      baseURL: options.fulcioBaseURL,
      retry: options.retry,
      timeout: options.timeout,
    });
  }

  public async createSigningCertificate(
    identityToken: string,
    publicKey: string,
    challenge: Buffer
  ): Promise<string[]> {
    const request = toCertificateRequest(identityToken, publicKey, challenge);

    try {
      const resp = await this.fulcio.createSigningCertificate(request);

      // Account for the fact that the response may contain either a
      // signedCertificateEmbeddedSct or a signedCertificateDetachedSct.
      const cert = resp.signedCertificateEmbeddedSct
        ? resp.signedCertificateEmbeddedSct
        : resp.signedCertificateDetachedSct;
    
      return cert!.chain.certificates;
    } catch (err) {
      internalError(
        err,
        'CA_CREATE_SIGNING_CERTIFICATE_ERROR',
        'error creating signing certificate'
      );
    }
  }
}

function toCertificateRequest(
  identityToken: string,
  publicKey: string,
  challenge: Buffer
): SigningCertificateRequest {
  return {
    credentials: {
      oidcIdentityToken: identityToken,
    },
    publicKeyRequest: {
      publicKey: {
        algorithm: 'ECDSA',
        content: publicKey,
      },
      proofOfPossession: challenge.toString('base64'),
    },
  };
}
