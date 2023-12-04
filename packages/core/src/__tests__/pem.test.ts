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
import { toDER } from '../pem';

describe('toDER', () => {
  describe('when the object is a certificate', () => {
    const pem =
      '-----BEGIN CERTIFICATE-----\nABCD\n-----END CERTIFICATE-----\n';
    it('returns a DER-encoded certificate', () => {
      const der = toDER(pem);
      expect(der).toEqual(Buffer.from('ABCD', 'base64'));
    });
  });

  describe('when the object is a key', () => {
    const pem = '-----BEGIN PUBLIC KEY-----\nDEFG\n-----END PUBLIC KEY-----\n';
    it('returns a DER-encoded key', () => {
      const der = toDER(pem);
      expect(der).toEqual(Buffer.from('DEFG', 'base64'));
    });
  });
});
