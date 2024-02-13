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
import { bundleFromJSON } from '@sigstore/bundle';
import { X509Certificate } from '@sigstore/core';
import assert from 'assert';
import { toSignedEntity } from '../../bundle';
import * as bundles from '../__fixtures__/bundles';

describe('toSignedEntity', () => {
  describe('when the bundle is a dsseEnvelope', () => {
    const bundle = bundleFromJSON(bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_DSSE);

    it('returns a SignedEntity', () => {
      const entity = toSignedEntity(bundle);

      expect(entity).toBeDefined();

      assert(entity.key.$case === 'certificate');
      expect(entity.key.certificate).toBeInstanceOf(X509Certificate);

      expect(entity.signature).toBeDefined();
      expect(entity.tlogEntries).toHaveLength(1);
      expect(entity.timestamps).toHaveLength(2);
    });
  });

  describe('when the bundle has no RFC3161 timestamps', () => {
    const bundle = bundleFromJSON(bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_DSSE);

    beforeEach(() => {
      bundle.verificationMaterial.timestampVerificationData = undefined;
    });

    it('returns a SignedEntity', () => {
      const entity = toSignedEntity(bundle);

      expect(entity).toBeDefined();

      assert(entity.key.$case === 'certificate');
      expect(entity.key.certificate).toBeInstanceOf(X509Certificate);

      expect(entity.signature).toBeDefined();
      expect(entity.tlogEntries).toHaveLength(1);
      expect(entity.timestamps).toHaveLength(1);
    });
  });

  describe('when the bundle is a messageSignature', () => {
    const bundle = bundleFromJSON(bundles.V1.MESSAGE_SIGNATURE.WITH_PUBLIC_KEY);

    it('returns a SignedEntity', () => {
      const entity = toSignedEntity(bundle);

      expect(entity).toBeDefined();

      assert(entity.key.$case === 'public-key');
      expect(entity.key.hint).toBeDefined();

      expect(entity.signature).toBeDefined();
      expect(entity.tlogEntries).toHaveLength(1);
      expect(entity.timestamps).toHaveLength(2);
    });
  });

  describe('when the bundle is v03', () => {
    const bundle = bundleFromJSON(
      bundles.V3.MESSAGE_SIGNATURE.WITH_SIGNING_CERT
    );

    it('returns a SignedEntity', () => {
      const entity = toSignedEntity(bundle);

      expect(entity).toBeDefined();

      assert(entity.key.$case === 'certificate');
      expect(entity.key.certificate).toBeInstanceOf(X509Certificate);

      expect(entity.signature).toBeDefined();
      expect(entity.tlogEntries).toHaveLength(0);
      expect(entity.timestamps).toHaveLength(1);
    });
  });
});
