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
import { Signer } from './sign';
import { sign, signAttestation, verify } from './sigstore';
import {
  Bundle,
  HashAlgorithm,
  SerializedBundle,
  VerificationData,
  X509CertificateChain,
} from './types/bundle';

jest.mock('./sign');

const verificationData: VerificationData = {
  tlogEntries: [
    {
      logIndex: '0',
      logId: {
        keyId: Buffer.from('logId'),
      },
      kindVersion: {
        kind: 'kind',
        version: 'version',
      },
      integratedTime: '2021-01-01T00:00:00Z',
      inclusionPromise: {
        signedEntryTimestamp: Buffer.from('inclusionPromise'),
      },
      inclusionProof: {
        logIndex: '0',
        rootHash: Buffer.from('rootHash'),
        treeSize: '0',
        hashes: [Buffer.from('hash')],
        checkpoint: {
          envelope: 'checkpoint',
        },
      },
    },
  ],
  timestampVerificationData: {
    rfc3161Timestamps: [{ signedTimestamp: Buffer.from('signedTimestamp') }],
  },
};

const x509CertificateChain: X509CertificateChain = {
  certificates: [{ derBytes: Buffer.from('certificate') }],
};

describe('sign', () => {
  const payload = Buffer.from('Hello, world!');

  // Signer output
  const bundle: Bundle = {
    mediaType: 'test/output',
    verificationData: verificationData,
    verificationMaterial: {
      content: {
        $case: 'x509CertificateChain',
        x509CertificateChain: x509CertificateChain,
      },
    },
    content: {
      $case: 'messageSignature',
      messageSignature: {
        messageDigest: {
          algorithm: HashAlgorithm.SHA2_256,
          digest: Buffer.from('messageDigest'),
        },
        signature: Buffer.from('signature'),
      },
    },
  };

  const mockSigner = jest.mocked(Signer);
  const mockSign = jest.fn();

  beforeEach(() => {
    mockSigner.mockClear();

    mockSign.mockClear();
    mockSign.mockResolvedValueOnce(bundle);
    jest.spyOn(Signer.prototype, 'signBlob').mockImplementation(mockSign);
  });

  it('constructs the Signer with the correct options', async () => {
    await sign(payload);

    // Signer was constructed
    expect(mockSigner).toHaveBeenCalledTimes(1);
    const args = mockSigner.mock.calls[0];

    // Signer was constructed with options
    expect(args).toHaveLength(1);
    const options = args[0];

    // Signer was constructed with the correct options
    expect(options).toHaveProperty('fulcio', expect.anything());
    expect(options).toHaveProperty('tlog', expect.anything());
    expect(options.identityProviders).toHaveLength(1);
  });

  it('invokes the Signer instance with the correct params', async () => {
    await sign(payload);

    expect(mockSign).toHaveBeenCalledWith(payload);
  });

  it('returns the correct envelope', async () => {
    const sig = await sign(payload);

    expect(sig).toEqual(Bundle.toJSON(bundle));
  });
});

describe('signAttestation', () => {
  const payload = Buffer.from('Hello, world!');
  const payloadType = 'text/plain';

  // Signer output
  const bundle: Bundle = {
    mediaType: 'test/output',
    verificationData: verificationData,
    verificationMaterial: {
      content: {
        $case: 'x509CertificateChain',
        x509CertificateChain: x509CertificateChain,
      },
    },
    content: {
      $case: 'dsseEnvelope',
      dsseEnvelope: {
        payload: payload,
        payloadType: payloadType,
        signatures: [
          {
            keyid: 'keyid',
            sig: Buffer.from('signature'),
          },
        ],
      },
    },
  };

  const mockSigner = jest.mocked(Signer);
  const mockSign = jest.fn();

  beforeEach(() => {
    mockSigner.mockClear();

    mockSign.mockClear();
    mockSign.mockResolvedValueOnce(bundle);
    jest
      .spyOn(Signer.prototype, 'signAttestation')
      .mockImplementation(mockSign);
  });

  it('constructs the Signer with the correct options', async () => {
    await signAttestation(payload, payloadType);

    // Signer was constructed
    expect(mockSigner).toHaveBeenCalledTimes(1);
    const args = mockSigner.mock.calls[0];

    // Signer was constructed with options
    expect(args).toHaveLength(1);
    const options = args[0];

    // Signer was constructed with the correct options
    expect(options).toHaveProperty('fulcio', expect.anything());
    expect(options).toHaveProperty('tlog', expect.anything());
    expect(options.identityProviders).toHaveLength(1);
  });

  it('invokes the Signer instance with the correct params', async () => {
    await signAttestation(payload, payloadType);

    expect(mockSign).toHaveBeenCalledWith(payload, payloadType);
  });

  it('returns the correct envelope', async () => {
    const sig = await signAttestation(payload, payloadType);

    expect(sig).toEqual(Bundle.toJSON(bundle));
  });
});

describe('#verify', () => {
  const artifact = Buffer.from('hello, world!');
  const bundle: SerializedBundle = {
    mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.1',
    verificationData: {
      tlogEntries: [
        {
          logIndex: '6119844',
          logId: { keyId: 'wNI9atQGlz+VWfO6LRygH4QUfY/8W4RFwiT5i5WRgB0=' },
          kindVersion: { kind: 'hashedrekord', version: '0.0.1' },
          integratedTime: '1667074164',
          inclusionPromise: {
            signedEntryTimestamp:
              'MEYCIQC1Obm8lhrQt9YTBdBXfvYlkxC8RtgXwKPfHLPfZyyhSwIhAPC5Ow/iKiouuEuPzrcUnIZ7wjXLrvQP/M3yXBTunRMp',
          },
          inclusionProof: undefined,
        },
      ],
      timestampVerificationData: { rfc3161Timestamps: [] },
    },
    verificationMaterial: {
      x509CertificateChain: {
        certificates: [
          {
            derBytes:
              'MIICoTCCAiegAwIBAgIUSFKo3qe+NIIcCxlV4ST3xi04BgswCgYIKoZIzj0EAwMwNzEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MR4wHAYDVQQDExVzaWdzdG9yZS1pbnRlcm1lZGlhdGUwHhcNMjIxMDI5MjAwOTIzWhcNMjIxMDI5MjAxOTIzWjAAMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEB4UFbL4DsSbTWJSZpfY18aFYncCEadUGoPtAnUOwf9xpUjr3ZMKgW0dqI9HcITO6YTxmCOx8L3PeRU3hA9oYFKOCAUYwggFCMA4GA1UdDwEB/wQEAwIHgDATBgNVHSUEDDAKBggrBgEFBQcDAzAdBgNVHQ4EFgQUxM/a1LX5zJT7UzfElZn/BExx3t0wHwYDVR0jBBgwFoAU39Ppz1YkEZb5qNjpKFWixi4YZD8wHwYDVR0RAQH/BBUwE4ERYnJpYW5AZGVoYW1lci5jb20wLAYKKwYBBAGDvzABAQQeaHR0cHM6Ly9naXRodWIuY29tL2xvZ2luL29hdXRoMIGLBgorBgEEAdZ5AgQCBH0EewB5AHcACGCS8ChS/2hF0dFrJ4ScRWcYrBY9wzjSbea8IgY2b3IAAAGEJV0EjAAABAMASDBGAiEAkhFxAlQnVP3VqvdAOlIZaEcL06DVzMf262lbgXfgbYECIQCp0EhupvEyWnvRKJTBPSM6BmCM69EzK11BJ0mhYvjmZjAKBggqhkjOPQQDAwNoADBlAjAOoaelWFKbJAmhtblMsn/Y4Qu69nm+o1OXAsz1Yjv0Quhd2sg3unfcR+yOrVYajr8CMQDrPBdPv6gPLVYqvJaq77ecpI0Q+62naoe2psVrHtfmzJ29WX4BumsVyWeb9VLjduo=',
          },
          {
            derBytes:
              'MIICGjCCAaGgAwIBAgIUALnViVfnU0brJasmRkHrn/UnfaQwCgYIKoZIzj0EAwMwKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTAeFw0yMjA0MTMyMDA2MTVaFw0zMTEwMDUxMzU2NThaMDcxFTATBgNVBAoTDHNpZ3N0b3JlLmRldjEeMBwGA1UEAxMVc2lnc3RvcmUtaW50ZXJtZWRpYXRlMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE8RVS/ysH+NOvuDZyPIZtilgUF9NlarYpAd9HP1vBBH1U5CV77LSS7s0ZiH4nE7Hv7ptS6LvvR/STk798LVgMzLlJ4HeIfF3tHSaexLcYpSASr1kS0N/RgBJz/9jWCiXno3sweTAOBgNVHQ8BAf8EBAMCAQYwEwYDVR0lBAwwCgYIKwYBBQUHAwMwEgYDVR0TAQH/BAgwBgEB/wIBADAdBgNVHQ4EFgQU39Ppz1YkEZb5qNjpKFWixi4YZD8wHwYDVR0jBBgwFoAUWMAeX5FFpWapesyQoZMi0CrFxfowCgYIKoZIzj0EAwMDZwAwZAIwPCsQK4DYiZYDPIaDi5HFKnfxXx6ASSVmERfsynYBiX2X6SJRnZU84/9DZdnFvvxmAjBOt6QpBlc4J/0DxvkTCqpclvziL6BCCPnjdlIB3Pu3BxsPmygUY7Ii2zbdCdliiow=',
          },
          {
            derBytes:
              'MIIB9zCCAXygAwIBAgIUALZNAPFdxHPwjeDloDwyYChAO/4wCgYIKoZIzj0EAwMwKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTAeFw0yMTEwMDcxMzU2NTlaFw0zMTEwMDUxMzU2NThaMCoxFTATBgNVBAoTDHNpZ3N0b3JlLmRldjERMA8GA1UEAxMIc2lnc3RvcmUwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAT7XeFT4rb3PQGwS4IajtLk3/OlnpgangaBclYpsYBr5i+4ynB07ceb3LP0OIOZdxexX69c5iVuyJRQ+Hz05yi+UF3uBWAlHpiS5sh0+H2GHE7SXrk1EC5m1Tr19L9gg92jYzBhMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBRYwB5fkUWlZql6zJChkyLQKsXF+jAfBgNVHSMEGDAWgBRYwB5fkUWlZql6zJChkyLQKsXF+jAKBggqhkjOPQQDAwNpADBmAjEAj1nHeXZp+13NWBNa+EDsDP8G1WWg1tCMWP/WHPqpaVo0jhsweNFZgSs0eE7wYI4qAjEA2WB9ot98sIkoF3vZYdd3/VtWB5b9TNMea7Ix/stJ5TfcLLeABLE4BNJOsQ4vnBHJ',
          },
        ],
      },
      publicKey: undefined,
    },
    messageSignature: {
      messageDigest: {
        algorithm: 'SHA2_256',
        digest: 'aOZWslHmfoNYvvhIOrDVHGYZ8+ehqfDnWDjUH/No9yg=',
      },
      signature:
        'MEQCIC59AHp1YEsCzdevfVrPjligHFkH9iA8VmpgsR5Nl1gvAiA2m7s/H6xvZtU74Qmwe12M04xCBhEmseuGNbv4Ecivqw==',
    },
    dsseEnvelope: undefined,
  };

  describe('when everything in the bundle is valid', () => {
    it('does not throw an error', async () => {
      await expect(verify(bundle, artifact)).resolves.toBe(undefined);
    });
  });

  describe('when there is a signature mismatch', () => {
    it('throws an error', async () => {
      await expect(verify(bundle, Buffer.from(''))).rejects.toThrowError(
        /signature verification failed/
      );
    });
  });

  describe('when SET in bundle verification data does not match payload', () => {
    const bundleWithBadSET = { ...bundle };
    it('throws an error', async () => {
      if (!bundleWithBadSET.verificationData) {
        fail('bundleWithBadSET.verificationData is undefined');
      }

      // Update integratedTime to be different from that signed by the SET
      bundleWithBadSET.verificationData.tlogEntries[0].integratedTime = '1';

      await expect(verify(bundleWithBadSET, artifact)).rejects.toThrowError(
        /SET verification failed/
      );
    });
  });
});
