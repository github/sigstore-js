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
import os from 'os';

// Format User-Agent: <product> / <product-version> (<platform>)
// source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent
export const getUserAgent = (): string => {
  const packageVersion = require('../../package.json').version;
  const nodeVersion = process.version;
  const platformName = os.platform();
  const archName = os.arch();
  return `sigstore-js/${packageVersion} (Node ${nodeVersion}) (${platformName}/${archName})`;
};
