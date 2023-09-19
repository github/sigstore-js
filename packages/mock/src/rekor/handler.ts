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

import assert from 'assert';
import type { Handler, HandlerFn, HandlerFnResult } from '../shared.types';
import type { TLog } from './tlog';

const CREATE_ENTRY_PATH = '/api/v1/log/entries';

interface RekorHandlerOptions {
  strict?: boolean;
}

export function rekorHandler(
  tlog: TLog,
  opts: RekorHandlerOptions = {}
): Handler {
  return {
    path: CREATE_ENTRY_PATH,
    fn: createEntryHandler(tlog, opts),
  };
}

function createEntryHandler(tlog: TLog, opts: RekorHandlerOptions): HandlerFn {
  const strict = opts.strict ?? true;

  return async (body: string): Promise<HandlerFnResult> => {
    try {
      const proposedEntry = strict
        ? JSON.parse(body)
        : { kind: 'intoto', apiVersion: '0.0.2' };
      const tlogEntry = await tlog.log(proposedEntry);
      const response = JSON.stringify(tlogEntry);

      return { statusCode: 201, response, contentType: 'application/json' };
    } catch (e) {
      assert(e instanceof Error);
      return { statusCode: 400, response: e.message };
    }
  };
}
