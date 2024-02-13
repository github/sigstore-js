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
import {
  Envelope,
  HashAlgorithm,
  MessageSignature,
  PublicKeyIdentifier,
  TimestampVerificationData,
  TransparencyLogEntry,
  X509CertificateChain,
  hashAlgorithmToJSON,
} from '@sigstore/protobuf-specs';
import {
  bundleFromJSON,
  bundleToJSON,
  envelopeFromJSON,
  envelopeToJSON,
} from '../serialized';

import type { Bundle } from '../bundle';

describe('envelopeToJSON', () => {
  const dsseEnvelope: Envelope = {
    payload: Buffer.from('payload'),
    payloadType: 'application/vnd.in-toto+json',
    signatures: [
      {
        keyid: 'keyid',
        sig: Buffer.from('signature'),
      },
    ],
  };

  it('matches the serialized form of the Envelope', () => {
    const json = envelopeToJSON(dsseEnvelope);

    expect(json).toBeTruthy();
    expect(json.payload).toEqual(dsseEnvelope.payload.toString('base64'));
    expect(json.payloadType).toEqual(dsseEnvelope.payloadType);
    expect(json.signatures).toHaveLength(dsseEnvelope.signatures.length);
    const signature = json.signatures[0];
    const expectedSignature = dsseEnvelope.signatures[0];
    expect(signature).toBeTruthy();
    expect(signature?.keyid).toEqual(expectedSignature.keyid);
    expect(signature?.sig).toEqual(expectedSignature.sig.toString('base64'));
  });
});

describe('envelopeFromJSON', () => {
  const envelope = {
    payload: Buffer.from('ABC'),
    payloadType: 'application/json',
    signatures: [{ sig: Buffer.from('BAR'), keyid: '' }],
  };

  it('matches the deserialized form of the Envelope', () => {
    const json = envelopeToJSON(envelope);
    const deserializedEnvelope = envelopeFromJSON(json);
    expect(deserializedEnvelope).toEqual(envelope);
  });
});

describe('bundleToJSON', () => {
  const tlogEntries = [
    {
      logIndex: '0',
      logId: {
        keyId: Buffer.from('logId'),
      },
      kindVersion: {
        kind: 'kind',
        version: 'version',
      },
      canonicalizedBody: Buffer.from('body'),
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
  ] satisfies TransparencyLogEntry[];

  const timestampVerificationData: TimestampVerificationData = {
    rfc3161Timestamps: [{ signedTimestamp: Buffer.from('signedTimestamp') }],
  };

  const x509CertificateChain: X509CertificateChain = {
    certificates: [{ rawBytes: Buffer.from('certificate') }],
  };

  const publicKey: PublicKeyIdentifier = {
    hint: 'pki-hint',
  };

  describe('SerializedDSSEBundle', () => {
    const dsseEnvelope: Envelope = {
      payload: Buffer.from('payload'),
      payloadType: 'application/vnd.in-toto+json',
      signatures: [
        {
          keyid: 'keyid',
          sig: Buffer.from('signature'),
        },
      ],
    };

    const dsseBundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.1',
      content: {
        $case: 'dsseEnvelope',
        dsseEnvelope,
      },
      verificationMaterial: {
        content: {
          $case: 'x509CertificateChain',
          x509CertificateChain,
        },
        tlogEntries,
        timestampVerificationData,
      },
    };

    it('matches the serialized form of the Bundle', () => {
      const json = bundleToJSON(dsseBundle);

      expect(json.mediaType).toEqual(dsseBundle.mediaType);
      expect(json.verificationMaterial).toBeTruthy();
      expect(json.verificationMaterial?.x509CertificateChain).toBeTruthy();
      expect(
        json.verificationMaterial?.x509CertificateChain?.certificates
      ).toHaveLength(x509CertificateChain.certificates.length);

      const cert =
        json.verificationMaterial?.x509CertificateChain?.certificates[0];
      expect(cert?.rawBytes).toEqual(
        Buffer.from(x509CertificateChain.certificates[0].rawBytes).toString(
          'base64'
        )
      );

      expect(json.verificationMaterial?.tlogEntries).toHaveLength(
        tlogEntries.length
      );

      const tlogEntry = json.verificationMaterial?.tlogEntries[0];
      const expectedTlogEntry = tlogEntries[0];
      expect(tlogEntry).toBeTruthy();
      expect(tlogEntry?.logId).toBeTruthy();
      expect(tlogEntry?.logId.keyId).toEqual(
        (expectedTlogEntry.logId?.keyId as Buffer).toString('base64')
      );
      expect(tlogEntry?.logIndex).toEqual(expectedTlogEntry.logIndex);
      expect(tlogEntry?.kindVersion).toBeTruthy();
      expect(tlogEntry?.kindVersion?.kind).toEqual(
        expectedTlogEntry.kindVersion?.kind
      );
      expect(tlogEntry?.kindVersion?.version).toEqual(
        expectedTlogEntry.kindVersion?.version
      );
      expect(tlogEntry?.canonicalizedBody).toEqual(
        expectedTlogEntry.canonicalizedBody.toString('base64')
      );
      expect(tlogEntry?.integratedTime).toEqual(
        expectedTlogEntry.integratedTime
      );
      expect(tlogEntry?.inclusionPromise).toBeTruthy();
      expect(tlogEntry?.inclusionPromise?.signedEntryTimestamp).toEqual(
        (
          expectedTlogEntry.inclusionPromise?.signedEntryTimestamp as Buffer
        ).toString('base64')
      );
      expect(tlogEntry?.inclusionProof).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.logIndex).toEqual(
        expectedTlogEntry.inclusionProof?.logIndex
      );
      expect(tlogEntry?.inclusionProof?.rootHash).toEqual(
        (expectedTlogEntry.inclusionProof?.rootHash as Buffer).toString(
          'base64'
        )
      );
      expect(tlogEntry?.inclusionProof?.treeSize).toEqual(
        expectedTlogEntry.inclusionProof?.treeSize
      );
      expect(tlogEntry?.inclusionProof?.hashes).toHaveLength(
        expectedTlogEntry.inclusionProof?.hashes?.length as number
      );
      const hash = tlogEntry?.inclusionProof?.hashes[0];
      const expectedHash = expectedTlogEntry.inclusionProof?.hashes?.[0];
      expect(hash).toEqual((expectedHash as Buffer).toString('base64'));
      expect(tlogEntry?.inclusionProof?.checkpoint).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.checkpoint.envelope).toEqual(
        expectedTlogEntry.inclusionProof?.checkpoint?.envelope
      );

      expect(json.verificationMaterial?.timestampVerificationData).toBeTruthy();
      expect(
        json.verificationMaterial?.timestampVerificationData?.rfc3161Timestamps
      ).toHaveLength(
        timestampVerificationData?.rfc3161Timestamps?.length as number
      );
      const rfc3161Timestamp =
        json.verificationMaterial?.timestampVerificationData
          ?.rfc3161Timestamps[0];
      const expectedRfc3161Timestamp =
        timestampVerificationData?.rfc3161Timestamps?.[0];
      expect(rfc3161Timestamp).toBeTruthy();
      expect(rfc3161Timestamp?.signedTimestamp).toEqual(
        (expectedRfc3161Timestamp?.signedTimestamp as Buffer).toString('base64')
      );

      expect(json.dsseEnvelope).toBeTruthy();
      expect(json.dsseEnvelope?.payload).toEqual(
        dsseEnvelope.payload.toString('base64')
      );
      expect(json.dsseEnvelope?.payloadType).toEqual(dsseEnvelope.payloadType);
      expect(json.dsseEnvelope?.signatures).toHaveLength(
        dsseEnvelope.signatures.length
      );
      const signature = json.dsseEnvelope?.signatures[0];
      const expectedSignature = dsseEnvelope.signatures[0];
      expect(signature).toBeTruthy();
      expect(signature?.keyid).toEqual(expectedSignature.keyid);
      expect(signature?.sig).toEqual(expectedSignature.sig.toString('base64'));
    });

    it('matches the snapshot', () => {
      expect(bundleToJSON(dsseBundle)).toMatchSnapshot();
    });
  });

  describe('SerializedDSSEBundle (v0.3)', () => {
    const dsseEnvelope: Envelope = {
      payload: Buffer.from('payload'),
      payloadType: 'application/vnd.in-toto+json',
      signatures: [
        {
          keyid: 'keyid',
          sig: Buffer.from('signature'),
        },
      ],
    };

    const dsseBundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.3',
      content: {
        $case: 'dsseEnvelope',
        dsseEnvelope,
      },
      verificationMaterial: {
        content: {
          $case: 'certificate',
          certificate: { rawBytes: Buffer.from('certificate') },
        },
        tlogEntries,
        timestampVerificationData,
      },
    };

    it('matches the serialized form of the Bundle', () => {
      const json = bundleToJSON(dsseBundle);

      expect(json.mediaType).toEqual(dsseBundle.mediaType);
      expect(json.verificationMaterial).toBeTruthy();
      expect(json.verificationMaterial?.certificate).toBeTruthy();
      const cert = json.verificationMaterial?.certificate;
      expect(cert?.rawBytes).toEqual(
        Buffer.from(x509CertificateChain.certificates[0].rawBytes).toString(
          'base64'
        )
      );

      expect(json.verificationMaterial?.tlogEntries).toHaveLength(
        tlogEntries.length
      );

      const tlogEntry = json.verificationMaterial?.tlogEntries[0];
      const expectedTlogEntry = tlogEntries[0];
      expect(tlogEntry).toBeTruthy();
      expect(tlogEntry?.logId).toBeTruthy();
      expect(tlogEntry?.logId.keyId).toEqual(
        (expectedTlogEntry.logId?.keyId as Buffer).toString('base64')
      );
      expect(tlogEntry?.logIndex).toEqual(expectedTlogEntry.logIndex);
      expect(tlogEntry?.kindVersion).toBeTruthy();
      expect(tlogEntry?.kindVersion?.kind).toEqual(
        expectedTlogEntry.kindVersion?.kind
      );
      expect(tlogEntry?.kindVersion?.version).toEqual(
        expectedTlogEntry.kindVersion?.version
      );
      expect(tlogEntry?.canonicalizedBody).toEqual(
        expectedTlogEntry.canonicalizedBody.toString('base64')
      );
      expect(tlogEntry?.integratedTime).toEqual(
        expectedTlogEntry.integratedTime
      );
      expect(tlogEntry?.inclusionPromise).toBeTruthy();
      expect(tlogEntry?.inclusionPromise?.signedEntryTimestamp).toEqual(
        (
          expectedTlogEntry.inclusionPromise?.signedEntryTimestamp as Buffer
        ).toString('base64')
      );
      expect(tlogEntry?.inclusionProof).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.logIndex).toEqual(
        expectedTlogEntry.inclusionProof?.logIndex
      );
      expect(tlogEntry?.inclusionProof?.rootHash).toEqual(
        (expectedTlogEntry.inclusionProof?.rootHash as Buffer).toString(
          'base64'
        )
      );
      expect(tlogEntry?.inclusionProof?.treeSize).toEqual(
        expectedTlogEntry.inclusionProof?.treeSize
      );
      expect(tlogEntry?.inclusionProof?.hashes).toHaveLength(
        expectedTlogEntry.inclusionProof?.hashes?.length as number
      );
      const hash = tlogEntry?.inclusionProof?.hashes[0];
      const expectedHash = expectedTlogEntry.inclusionProof?.hashes?.[0];
      expect(hash).toEqual((expectedHash as Buffer).toString('base64'));
      expect(tlogEntry?.inclusionProof?.checkpoint).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.checkpoint.envelope).toEqual(
        expectedTlogEntry.inclusionProof?.checkpoint?.envelope
      );

      expect(json.verificationMaterial?.timestampVerificationData).toBeTruthy();
      expect(
        json.verificationMaterial?.timestampVerificationData?.rfc3161Timestamps
      ).toHaveLength(
        timestampVerificationData?.rfc3161Timestamps?.length as number
      );
      const rfc3161Timestamp =
        json.verificationMaterial?.timestampVerificationData
          ?.rfc3161Timestamps[0];
      const expectedRfc3161Timestamp =
        timestampVerificationData?.rfc3161Timestamps?.[0];
      expect(rfc3161Timestamp).toBeTruthy();
      expect(rfc3161Timestamp?.signedTimestamp).toEqual(
        (expectedRfc3161Timestamp?.signedTimestamp as Buffer).toString('base64')
      );

      expect(json.dsseEnvelope).toBeTruthy();
      expect(json.dsseEnvelope?.payload).toEqual(
        dsseEnvelope.payload.toString('base64')
      );
      expect(json.dsseEnvelope?.payloadType).toEqual(dsseEnvelope.payloadType);
      expect(json.dsseEnvelope?.signatures).toHaveLength(
        dsseEnvelope.signatures.length
      );
      const signature = json.dsseEnvelope?.signatures[0];
      const expectedSignature = dsseEnvelope.signatures[0];
      expect(signature).toBeTruthy();
      expect(signature?.keyid).toEqual(expectedSignature.keyid);
      expect(signature?.sig).toEqual(expectedSignature.sig.toString('base64'));
    });

    it('matches the snapshot', () => {
      expect(bundleToJSON(dsseBundle)).toMatchSnapshot();
    });
  });

  describe('SerializedMessageSignatureBundle', () => {
    const messageSignature = {
      messageDigest: {
        digest: Buffer.from('digest'),
        algorithm: 1,
      },
      signature: Buffer.from('signature'),
    } satisfies MessageSignature;

    const messageSignatureBundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.1',
      content: {
        $case: 'messageSignature',
        messageSignature,
      },
      verificationMaterial: {
        content: {
          $case: 'publicKey',
          publicKey,
        },
        tlogEntries,
        timestampVerificationData,
      },
    };

    it('matches the serialized form of the Bundle', () => {
      const json = bundleToJSON(messageSignatureBundle);

      expect(json.mediaType).toEqual(messageSignatureBundle.mediaType);
      expect(json.verificationMaterial).toBeTruthy();
      expect(json.verificationMaterial?.publicKey).toBeTruthy();
      expect(json.verificationMaterial?.publicKey?.hint).toEqual(
        publicKey.hint
      );

      expect(json.verificationMaterial?.tlogEntries).toHaveLength(
        tlogEntries.length
      );

      const tlogEntry = json.verificationMaterial?.tlogEntries[0];
      const expectedTlogEntry = tlogEntries[0];
      expect(tlogEntry).toBeTruthy();
      expect(tlogEntry?.logId).toBeTruthy();
      expect(tlogEntry?.logId.keyId).toEqual(
        (expectedTlogEntry.logId?.keyId as Buffer).toString('base64')
      );
      expect(tlogEntry?.logIndex).toEqual(expectedTlogEntry.logIndex);
      expect(tlogEntry?.kindVersion).toBeTruthy();
      expect(tlogEntry?.kindVersion?.kind).toEqual(
        expectedTlogEntry.kindVersion?.kind
      );
      expect(tlogEntry?.kindVersion?.version).toEqual(
        expectedTlogEntry.kindVersion?.version
      );
      expect(tlogEntry?.canonicalizedBody).toEqual(
        expectedTlogEntry.canonicalizedBody.toString('base64')
      );
      expect(tlogEntry?.integratedTime).toEqual(
        expectedTlogEntry.integratedTime
      );
      expect(tlogEntry?.inclusionPromise).toBeTruthy();
      expect(tlogEntry?.inclusionPromise?.signedEntryTimestamp).toEqual(
        (
          expectedTlogEntry.inclusionPromise?.signedEntryTimestamp as Buffer
        ).toString('base64')
      );
      expect(tlogEntry?.inclusionProof).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.logIndex).toEqual(
        expectedTlogEntry.inclusionProof?.logIndex
      );
      expect(tlogEntry?.inclusionProof?.rootHash).toEqual(
        (expectedTlogEntry.inclusionProof?.rootHash as Buffer).toString(
          'base64'
        )
      );
      expect(tlogEntry?.inclusionProof?.treeSize).toEqual(
        expectedTlogEntry.inclusionProof?.treeSize
      );
      expect(tlogEntry?.inclusionProof?.hashes).toHaveLength(
        expectedTlogEntry.inclusionProof?.hashes?.length as number
      );
      const hash = tlogEntry?.inclusionProof?.hashes[0];
      const expectedHash = expectedTlogEntry.inclusionProof?.hashes?.[0];
      expect(hash).toEqual((expectedHash as Buffer).toString('base64'));
      expect(tlogEntry?.inclusionProof?.checkpoint).toBeTruthy();
      expect(tlogEntry?.inclusionProof?.checkpoint.envelope).toEqual(
        expectedTlogEntry.inclusionProof?.checkpoint?.envelope
      );

      expect(json.verificationMaterial?.timestampVerificationData).toBeTruthy();
      expect(
        json.verificationMaterial?.timestampVerificationData?.rfc3161Timestamps
      ).toHaveLength(
        timestampVerificationData?.rfc3161Timestamps?.length as number
      );
      const rfc3161Timestamp =
        json.verificationMaterial?.timestampVerificationData
          ?.rfc3161Timestamps[0];
      const expectedRfc3161Timestamp =
        timestampVerificationData?.rfc3161Timestamps?.[0];
      expect(rfc3161Timestamp).toBeTruthy();
      expect(rfc3161Timestamp?.signedTimestamp).toEqual(
        (expectedRfc3161Timestamp?.signedTimestamp as Buffer).toString('base64')
      );

      expect(json.messageSignature).toBeTruthy();
      expect(json.messageSignature?.messageDigest).toBeTruthy();
      expect(json.messageSignature?.messageDigest?.digest).toEqual(
        (messageSignature.messageDigest?.digest as Buffer).toString('base64')
      );
      expect(json.messageSignature?.messageDigest?.algorithm).toEqual(
        hashAlgorithmToJSON(
          messageSignature.messageDigest?.algorithm as HashAlgorithm
        )
      );

      expect(json.messageSignature?.signature).toEqual(
        (messageSignature.signature as Buffer).toString('base64')
      );
    });

    it('matches the snapshot', () => {
      expect(bundleToJSON(messageSignatureBundle)).toMatchSnapshot();
    });
  });
});

describe('bundleFromJSON', () => {
  describe('when the bundle is a v0.1 bundle', () => {
    const bundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.1',
      verificationMaterial: {
        content: {
          $case: 'x509CertificateChain',
          x509CertificateChain: {
            certificates: [{ rawBytes: Buffer.from('FOO') }],
          },
        },
        tlogEntries: [
          {
            logIndex: '123',
            logId: { keyId: Buffer.from('123') },
            kindVersion: { kind: 'intoto', version: '0.1.0' },
            canonicalizedBody: Buffer.from(''),
            integratedTime: '0',
            inclusionPromise: { signedEntryTimestamp: Buffer.from('') },
            inclusionProof: undefined,
          },
        ],
        timestampVerificationData: undefined,
      },
      content: {
        $case: 'dsseEnvelope',
        dsseEnvelope: {
          payload: Buffer.from('ABC'),
          payloadType: 'application/json',
          signatures: [{ sig: Buffer.from('BAR'), keyid: '' }],
        },
      },
    };

    it('matches the deserialized form of the Bundle', () => {
      const json = bundleToJSON(bundle);
      const deserializedBundle = bundleFromJSON(json);
      expect(deserializedBundle).toEqual(bundle);
    });
  });

  describe('when the bundle is a v0.2 bundle', () => {
    const bundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.2',
      verificationMaterial: {
        content: {
          $case: 'x509CertificateChain',
          x509CertificateChain: {
            certificates: [{ rawBytes: Buffer.from('FOO') }],
          },
        },
        tlogEntries: [
          {
            logIndex: '123',
            logId: { keyId: Buffer.from('123') },
            kindVersion: { kind: 'intoto', version: '0.1.0' },
            canonicalizedBody: Buffer.from(''),
            integratedTime: '0',
            inclusionPromise: undefined,
            inclusionProof: {
              checkpoint: { envelope: '' },
              hashes: [],
              logIndex: '',
              rootHash: Buffer.from(''),
              treeSize: '',
            },
          },
        ],
        timestampVerificationData: undefined,
      },
      content: {
        $case: 'dsseEnvelope',
        dsseEnvelope: {
          payload: Buffer.from('ABC'),
          payloadType: 'application/json',
          signatures: [{ sig: Buffer.from('BAR'), keyid: '' }],
        },
      },
    };

    it('matches the deserialized form of the Bundle', () => {
      const json = bundleToJSON(bundle);
      const deserializedBundle = bundleFromJSON(json);
      expect(deserializedBundle).toEqual(bundle);
    });
  });

  describe('when the bundle is a v0.3 bundle', () => {
    const bundle: Bundle = {
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.3',
      verificationMaterial: {
        content: {
          $case: 'certificate',
          certificate: { rawBytes: Buffer.from('FOO') },
        },
        tlogEntries: [
          {
            logIndex: '123',
            logId: { keyId: Buffer.from('123') },
            kindVersion: { kind: 'intoto', version: '0.1.0' },
            canonicalizedBody: Buffer.from(''),
            integratedTime: '0',
            inclusionPromise: undefined,
            inclusionProof: {
              checkpoint: { envelope: '' },
              hashes: [],
              logIndex: '',
              rootHash: Buffer.from(''),
              treeSize: '',
            },
          },
        ],
        timestampVerificationData: undefined,
      },
      content: {
        $case: 'dsseEnvelope',
        dsseEnvelope: {
          payload: Buffer.from('ABC'),
          payloadType: 'application/json',
          signatures: [{ sig: Buffer.from('BAR'), keyid: '' }],
        },
      },
    };

    it('matches the deserialized form of the Bundle', () => {
      const json = bundleToJSON(bundle);
      const deserializedBundle = bundleFromJSON(json);
      expect(deserializedBundle).toEqual(bundle);
    });
  });
});

describe('envelopeToJSON', () => {
  const dsseEnvelope: Envelope = {
    payload: Buffer.from('payload'),
    payloadType: 'application/vnd.in-toto+json',
    signatures: [
      {
        keyid: 'keyid',
        sig: Buffer.from('signature'),
      },
    ],
  };

  it('matches the serialized form of the Envelope', () => {
    const json = envelopeToJSON(dsseEnvelope);

    expect(json).toBeTruthy();
    expect(json.payload).toEqual(dsseEnvelope.payload.toString('base64'));
    expect(json.payloadType).toEqual(dsseEnvelope.payloadType);
    expect(json.signatures).toHaveLength(dsseEnvelope.signatures.length);
    const signature = json.signatures[0];
    const expectedSignature = dsseEnvelope.signatures[0];
    expect(signature).toBeTruthy();
    expect(signature?.keyid).toEqual(expectedSignature.keyid);
    expect(signature?.sig).toEqual(expectedSignature.sig.toString('base64'));
  });
});

describe('envelopeFromJSON', () => {
  const envelope = {
    payload: Buffer.from('ABC'),
    payloadType: 'application/json',
    signatures: [{ sig: Buffer.from('BAR'), keyid: '' }],
  };

  it('matches the deserialized form of the Envelope', () => {
    const json = envelopeToJSON(envelope);
    const deserializedEnvelope = envelopeFromJSON(json);
    expect(deserializedEnvelope).toEqual(envelope);
  });
});
