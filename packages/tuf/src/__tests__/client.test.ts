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
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import mocktuf, { Target } from '@tufjs/repo-mock';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TUFClient, TUFOptions } from '../client';
import { TUFError } from '../error';

describe('TUFClient', () => {
  const rootPath = require.resolve(
    '../../store/public-good-instance-root.json'
  );

  describe('constructor', () => {
    const cacheDir = path.join(os.tmpdir(), 'tuf-client-test');
    const mirrorURL = 'https://example.com';
    afterEach(() => fs.rmSync(cacheDir, { recursive: true }));

    describe('when the cache directory does not exist', () => {
      it('creates the cache directory', () => {
        new TUFClient({ cachePath: cacheDir, mirrorURL, rootPath });
        expect(fs.existsSync(cacheDir)).toEqual(true);
        expect(fs.existsSync(path.join(cacheDir, 'root.json'))).toEqual(true);
        expect(fs.existsSync(path.join(cacheDir, 'remote.json'))).toEqual(true);
      });
    });

    describe('when the cache directory already exists', () => {
      beforeEach(() => {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.copyFileSync(rootPath, path.join(cacheDir, 'root.json'));
        fs.writeFileSync(
          path.join(cacheDir, 'remote.json'),
          JSON.stringify({ mirror: mirrorURL })
        );
      });

      it('loads config from the existing directory without error', () => {
        expect(
          () => new TUFClient({ cachePath: cacheDir, mirrorURL, rootPath })
        ).not.toThrow();
      });
    });
  });

  describe('getTarget', () => {
    let tufRepo: ReturnType<typeof mocktuf> | undefined;
    let options: TUFOptions | undefined;

    const target: Target = {
      name: 'foo',
      content: 'bar',
    };

    beforeEach(() => {
      tufRepo = mocktuf(target, { metadataPathPrefix: '' });
      options = {
        mirrorURL: tufRepo.baseURL,
        cachePath: tufRepo.cachePath,
        retry: false,
        rootPath,
      };
    });

    afterEach(() => tufRepo?.teardown());

    describe('when the target exists', () => {
      it('returns the target', async () => {
        const subject = new TUFClient(options!);
        const result = await subject.getTarget(target.name);
        expect(result).toEqual(target.content);
      });
    });

    describe('when the target does NOT exist', () => {
      it('throws an error', async () => {
        const subject = new TUFClient(options!);
        await subject.refresh();
        await expect(subject.getTarget('baz')).rejects.toThrowError(TUFError);
      });

      it('throws an error with code TUF_FIND_TARGET_ERROR', async () => {
        const subject = new TUFClient(options!);
        expect.assertions(1);
        await subject.getTarget('baz').catch((err) => {
          expect(err.code).toEqual('TUF_FIND_TARGET_ERROR');
        });
      });
    });
  });
});
