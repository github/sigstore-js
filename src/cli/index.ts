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
import fs from 'fs';
import { sigstore } from '../index';
import { Bundle } from '../types/bundle';

const INTOTO_PAYLOAD_TYPE = 'application/vnd.in-toto+json';

async function cli(args: string[]) {
  switch (args[0]) {
    case 'sign':
      await sign(args[1]);
      break;
    case 'sign-dsse':
      await signDSSE(args[1], args[2]);
      break;
    case 'verify':
      await verify(args[1], args[2]);
      break;
    default:
      throw 'Unknown command';
  }
}

const signOptions = {
  oidcClientID: 'sigstore',
  oidcIssuer: 'https://oauth2.sigstore.dev/auth',
};

async function sign(artifactPath: string) {
  const buffer = fs.readFileSync(artifactPath);
  const bundle = await sigstore.sign(buffer, signOptions);

  const url = `${sigstore.getRekorBaseUrl(signOptions)}/api/v1/log/entries`;
  const logIndex = bundle.verificationData?.tlogEntries[0].logIndex;
  console.error(`Created entry at index ${logIndex}, available at`);
  console.error(`${url}?logIndex=${logIndex}`);

  console.log(JSON.stringify(Bundle.toJSON(bundle)));
}

async function signDSSE(
  artifactPath: string,
  payloadType = INTOTO_PAYLOAD_TYPE
) {
  const buffer = fs.readFileSync(artifactPath);
  const bundle = await sigstore.signAttestation(
    buffer,
    payloadType,
    signOptions
  );
  console.log(JSON.stringify(Bundle.toJSON(bundle)));
}

async function verify(bundlePath: string, artifactPath: string) {
  let payload: Buffer | undefined = undefined;

  if (artifactPath) {
    payload = fs.readFileSync(artifactPath);
  }

  const bundleFile = fs.readFileSync(bundlePath);
  const bundle = Bundle.fromJSON(JSON.parse(bundleFile.toString('utf-8')));

  const result = await sigstore.verify(bundle, payload);

  if (result) {
    console.error('Verified OK');
  } else {
    throw 'Signature verification failed';
  }
}

export async function processArgv(): Promise<void> {
  try {
    await cli(process.argv.slice(2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
