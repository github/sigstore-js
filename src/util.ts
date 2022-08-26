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
import os from 'os';
import * as enc from './encoding';

export function extractJWTSubject(jwt: string): string {
  const parts = jwt.split('.', 3);
  const payload = JSON.parse(enc.base64Decode(parts[1]));

  switch (payload.iss) {
    case 'https://accounts.google.com':
    case 'https://oauth2.sigstore.dev/auth':
      return payload.email;
    default:
      return payload.sub;
  }
}

// Implementation of Promise.any (not available until Node v15).
// We're basically inverting the logic of Promise.all and taking advantage
// of the fact that Promise.all will return early on the first rejection.
// By reversing the resolve/reject logic we can use this to return early
// on the first resolved promise.
export const promiseAny = async <T>(
  values: Iterable<PromiseLike<T>>
): Promise<T> => {
  return Promise.all<T>(
    [...values].map(
      (promise) =>
        new Promise((resolve, reject) => promise.then(reject, resolve))
    )
  ).then(
    (errors) => Promise.reject(errors),
    (value) => Promise.resolve<T>(value)
  );
};

// Format User-Agent: <product> / <product-version> (<platform>)
// source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent
export const getUserAgent = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageVersion = require('../package.json').version;
  const nodeVersion = process.version;
  const platformName = os.platform();
  const archName = os.arch();
  return `sigstore-js/${packageVersion} (Node ${nodeVersion}) (${platformName}/${archName})`;
};

// DSSE Pre-Authentication Encoding
export function dssePreAuthEncoding(
  payloadType: string,
  payload: Buffer
): Buffer {
  const prefix = Buffer.from(
    `DSSEv1 ${payloadType.length} ${payloadType} ${payload.length} `,
    'ascii'
  );
  return Buffer.concat([prefix, payload]);
}
