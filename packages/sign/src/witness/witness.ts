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
import type {
  Bundle,
  RFC3161SignedTimestamp,
  TransparencyLogEntry,
} from '@sigstore/bundle';

// Sigstore bundle with required content fields populated
export type SignatureBundle = Bundle['content'];

// Collection of transparency log entries and/or RFC3161 timestamps
export type VerificationMaterial = {
  tlogEntries?: TransparencyLogEntry[];
  rfc3161Timestamps?: RFC3161SignedTimestamp[];
};

export interface Witness {
  testify: (
    signature: SignatureBundle,
    publicKey: string
  ) => Promise<VerificationMaterial>;
}
