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
import * as sigstore from '../../types/sigstore';

describe('isCAVerificationOptions', () => {
  describe('when the verification options are for a CA', () => {
    const opts: sigstore.ArtifactVerificationOptions = {
      ctlogOptions: {
        detachedSct: false,
        disable: false,
        threshold: 1,
      },
      signers: {
        $case: 'certificateIdentities',
        certificateIdentities: {
          identities: [],
        },
      },
    };
    it('returns true', () => {
      expect(sigstore.isCAVerificationOptions(opts)).toBe(true);
    });
  });

  describe('when the verification options do not include ctlogOptions', () => {
    const opts: sigstore.ArtifactVerificationOptions = {
      signers: {
        $case: 'certificateIdentities',
        certificateIdentities: {
          identities: [],
        },
      },
    };

    it('returns false', () => {
      expect(sigstore.isCAVerificationOptions(opts)).toBe(false);
    });
  });

  describe('when the verification options do not include signers', () => {
    const opts: sigstore.ArtifactVerificationOptions = {
      ctlogOptions: {
        detachedSct: false,
        disable: false,
        threshold: 1,
      },
    };

    it('returns true', () => {
      expect(sigstore.isCAVerificationOptions(opts)).toBe(true);
    });
  });

  describe('when the verification options include public key signers', () => {
    const opts: sigstore.ArtifactVerificationOptions = {
      ctlogOptions: {
        detachedSct: false,
        disable: false,
        threshold: 1,
      },
      signers: {
        $case: 'publicKeys',
        publicKeys: {
          publicKeys: [],
        },
      },
    };

    it('returns false', () => {
      expect(sigstore.isCAVerificationOptions(opts)).toBe(false);
    });
  });
});
