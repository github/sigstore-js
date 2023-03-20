/*
Copyright 2022 The Sigstore Authors.

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
import * as crypto from 'crypto';
import { toCertificateRequest } from '../../ca/format';

describe('toCertificateRequest', () => {
  const identityToken = 'a.b.c';
  const key = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  }).publicKey;
  const challenge = Buffer.from('challenge');

  it('returns a CertificateRequest', () => {
    const cr = toCertificateRequest(identityToken, key, challenge);

    expect(cr.credentials.oidcIdentityToken).toEqual(identityToken);
    expect(cr.publicKeyRequest.publicKey.algorithm).toEqual('ECDSA');
    expect(cr.publicKeyRequest.publicKey.content).toEqual(
      key.export({ type: 'spki', format: 'pem' }).toString('ascii')
    );
    expect(cr.publicKeyRequest.proofOfPossession).toEqual(
      challenge.toString('base64')
    );
  });
});
