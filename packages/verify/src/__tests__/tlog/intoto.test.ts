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
import { BundleWithDsseEnvelope, bundleFromJSON } from '@sigstore/bundle';
import { signatureContent } from '../../bundle';
import { VerificationError } from '../../error';
import { verifyIntotoTLogBody } from '../../tlog/intoto';
import * as bundles from '../__fixtures__/bundles';

import type { ProposedIntotoEntry } from '@sigstore/rekor-types';

describe('verifyIntotoTLogBody', () => {
  describe('when everything is valid', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    it('does NOT throw an error', () => {
      expect(verifyIntotoTLogBody(body, content)).toBeUndefined();
    });
  });

  describe('when the payload hash does NOT match the value in the intoto entry', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      (bundle as BundleWithDsseEnvelope).content.dsseEnvelope.payload =
        Buffer.from('oops');
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });

  describe('when the signature does NOT match the value in the intoto entry', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      (body.spec.content.envelope as any).signatures[0].sig =
        Buffer.from('oops').toString('base64');
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });

  describe('when the tlog entry version is unsupported', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      (body as any).apiVersion = '0.0.0';
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });

  describe('when the signature count does NOT match the intoto entry', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const env = body.spec.content.envelope as any;
      env.signatures.push(env.signatures[0].sig);
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });

  describe('when there are no signatures', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const env = body.spec.content.envelope as any;
      delete env.signatures;
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });

  describe('when the tlog entry body is missing the payload hash', () => {
    const bundle = bundleFromJSON(
      bundles.V1.DSSE.WITH_SIGNING_CERT.TLOG_INTOTO
    );
    const tlogEntry = bundle.verificationMaterial.tlogEntries[0];
    const body: ProposedIntotoEntry = JSON.parse(
      tlogEntry.canonicalizedBody.toString('utf8')
    );
    const content = signatureContent(bundle);

    beforeEach(() => {
      body.spec.content.payloadHash = undefined;
    });

    it('throws an error', () => {
      expect(() => verifyIntotoTLogBody(body, content)).toThrowWithCode(
        VerificationError,
        'TLOG_BODY_ERROR'
      );
    });
  });
});
