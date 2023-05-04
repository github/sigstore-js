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
import fetch, { FetchInterface } from 'make-fetch-happen';
import { ua } from '../util';
import { checkStatus } from './error';

export interface TimestampRequest {
  artifact: string;
  hashAlgorithm: string;
  certificates?: boolean;
  nonce?: number;
  tsaPolicyOID?: string;
}

export interface TimestampAuthorityOptions {
  baseURL: string;
}

export class TimestampAuthority {
  private fetch: FetchInterface;
  private baseUrl: string;

  constructor(options: TimestampAuthorityOptions) {
    this.fetch = fetch.defaults({
      retry: { retries: 2 },
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ua.getUserAgent(),
      },
    });
    this.baseUrl = options.baseURL;
  }

  public async createTimestamp(request: TimestampRequest): Promise<Buffer> {
    const url = `${this.baseUrl}/api/v1/timestamp`;

    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    checkStatus(response);

    return response.buffer();
  }
}
