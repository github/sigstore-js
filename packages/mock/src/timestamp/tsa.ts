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

import { Crypto } from '@peculiar/webcrypto';
import * as asn1js from 'asn1js';
import type { KeyPairKeyObjectResult } from 'crypto';
import * as pkijs from 'pkijs';
import { DIGEST_SHA256, SIGNING_ALGORITHM_ECDSA_SHA384 } from '../constants';
import { ESSCertIDv2 } from '../util/ess-cert-id';
import { keyObjectToCryptoKey } from '../util/key';
import {
  createIntermediateCertificate,
  createRootCertificate,
} from '../util/root-cert';
import { SigningCertificateV2 } from '../util/signing-cert';

const ROOT_NAME = 'CN=tsa,O=sigstore.mock';
const INT_NAME = 'CN=tsa signing,O=sigstore.mock';

const SIGNED_DATA_DIGEST_ALGORITHM = DIGEST_SHA256;

const OID_TSTINFO_CONTENT_TYPE = '1.2.840.113549.1.9.16.1.4';
const OID_SIGNED_DATA_CONTENT_TYPE = '1.2.840.113549.1.7.2';
const OID_PKCS9_CONTENT_TYPE_KEY = '1.2.840.113549.1.9.3';
const OID_PKCS9_SIGNING_TIME_KEY = '1.2.840.113549.1.9.5';
const OKD_PKCS9_MESSAGE_DIGEST_KEY = '1.2.840.113549.1.9.4';
const OID_PKCS9_SIGNING_CERTIFICATE_V2_KEY = '1.2.840.113549.1.9.16.2.47';

export interface TSA {
  rootCertificate: Buffer;
  intCertificate: Buffer;
  timestamp: (req: TimestampRequest) => Promise<Buffer>;
}

export interface TimestampRequest {
  artifactHash: Buffer;
  hashAlgorithmOID: string;
  nonce: number;
  policyOID: string;
  certReq?: boolean;
}

export async function initializeTSA(
  keyPair: KeyPairKeyObjectResult,
  clock?: Date
): Promise<TSA> {
  const cryptoKeyPair = {
    privateKey: await keyObjectToCryptoKey(keyPair.privateKey),
    publicKey: await keyObjectToCryptoKey(keyPair.publicKey),
  };

  const root = await createRootCertificate(
    ROOT_NAME,
    cryptoKeyPair,
    SIGNING_ALGORITHM_ECDSA_SHA384
  );

  const int = await createIntermediateCertificate(
    INT_NAME,
    ROOT_NAME,
    cryptoKeyPair,
    SIGNING_ALGORITHM_ECDSA_SHA384
  );

  return new TSAImpl({
    rootCertificate: pkijs.Certificate.fromBER(root.cert.rawData),
    intCertificate: pkijs.Certificate.fromBER(int.cert.rawData),
    keyPair: cryptoKeyPair,
    clock,
  });
}

interface TSAOptions {
  rootCertificate: pkijs.Certificate;
  intCertificate: pkijs.Certificate;
  keyPair: CryptoKeyPair;
  clock?: Date;
}

class TSAImpl implements TSA {
  private rootCert: pkijs.Certificate;
  private intCert: pkijs.Certificate;
  private keyPair: CryptoKeyPair;
  private getCurrentTime: () => Date;
  private crypto: pkijs.ICryptoEngine;
  constructor(options: TSAOptions) {
    this.rootCert = options.rootCertificate;
    this.intCert = options.intCertificate;
    this.keyPair = options.keyPair;
    this.getCurrentTime = () => options.clock || new Date();
    this.crypto = new pkijs.CryptoEngine({
      crypto: new Crypto(),
    }) as pkijs.ICryptoEngine;
  }

  public get rootCertificate(): Buffer {
    return Buffer.from(this.rootCert.toSchema().toBER(false));
  }

  public get intCertificate(): Buffer {
    return Buffer.from(this.intCert.toSchema().toBER(false));
  }

  // Create a timestamp according to
  // https://www.rfc-editor.org/rfc/rfc3161.html
  public async timestamp(req: TimestampRequest): Promise<Buffer> {
    const includeCerts = req.certReq ?? false;

    // Create the TSTInfo structure and sign it
    const tstInfo = this.tstInfo(req);
    const signedData = await this.signedData(tstInfo, includeCerts);

    // Encode the SignedData structure
    const content = new pkijs.ContentInfo({
      contentType: OID_SIGNED_DATA_CONTENT_TYPE,
      content: signedData.toSchema(true),
    });

    const tspResponse = new pkijs.TimeStampResp({
      status: new pkijs.PKIStatusInfo({ status: 0 }),
      timeStampToken: new pkijs.ContentInfo({ schema: content.toSchema() }),
    });

    return Buffer.from(tspResponse.toSchema().toBER(false));
  }

  // Assemble the TSTInfo structure from the request
  private tstInfo(req: TimestampRequest): pkijs.TSTInfo {
    return new pkijs.TSTInfo({
      version: 1,
      policy: req.policyOID,
      messageImprint: new pkijs.MessageImprint({
        hashAlgorithm: new pkijs.AlgorithmIdentifier({
          algorithmId: req.hashAlgorithmOID,
        }),
        hashedMessage: new asn1js.OctetString({ valueHex: req.artifactHash }),
      }),
      serialNumber: new asn1js.Integer({
        valueHex: Buffer.from('DEADBEEF', 'hex'),
      }),
      genTime: this.getCurrentTime(),
      accuracy: new pkijs.Accuracy({ seconds: 1 }),
      nonce: new asn1js.Integer({ value: req.nonce }),
    });
  }

  // Wrap the TSTInfo structure in a SignedData structure
  private async signedData(
    tstInfo: pkijs.TSTInfo,
    includeCerts: boolean
  ): Promise<pkijs.SignedData> {
    const encapContent = new pkijs.EncapsulatedContentInfo({
      eContentType: OID_TSTINFO_CONTENT_TYPE,
    });
    // Avoid passing eContent to the constructor to circumvent the logic which
    // splits the eContent into chunks and introduces a new OCTET STRING
    encapContent.eContent = new asn1js.OctetString({
      valueHex: tstInfo.toSchema().toBER(false),
    });

    const tstInfoDigest = await this.crypto.digest(
      SIGNED_DATA_DIGEST_ALGORITHM,
      tstInfo.toSchema().toBER(false)
    );

    const signerDigest = await this.crypto.digest(
      DIGEST_SHA256,
      this.intCert.toSchema().toBER(false)
    );

    // Create the ESSCertIDv2 structure containing information about the
    // signing certificate which issued the timestamp
    const certID = new ESSCertIDv2({
      certHash: new asn1js.OctetString({ valueHex: signerDigest }),
      issuerSerial: new pkijs.IssuerSerial({
        issuer: new pkijs.GeneralNames({
          names: [
            new pkijs.GeneralName({ type: 4, value: this.intCert.issuer }),
          ],
        }),
        serialNumber: this.intCert.serialNumber,
      }),
    });

    const signingCert = new SigningCertificateV2({ certs: [certID] });

    // Create the signed attributes, including:
    // - contentType
    // - signingTime
    // - messageDigest (digest of the tstInfo structure)
    // - signingCertificateV2
    const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
      type: 0,
      attributes: [
        new pkijs.Attribute({
          type: OID_PKCS9_CONTENT_TYPE_KEY,
          values: [
            new asn1js.ObjectIdentifier({ value: OID_TSTINFO_CONTENT_TYPE }),
          ],
        }),
        new pkijs.Attribute({
          type: OID_PKCS9_SIGNING_TIME_KEY,
          values: [new asn1js.UTCTime({ valueDate: this.getCurrentTime() })],
        }),
        new pkijs.Attribute({
          type: OKD_PKCS9_MESSAGE_DIGEST_KEY,
          values: [new asn1js.OctetString({ valueHex: tstInfoDigest })],
        }),
        new pkijs.Attribute({
          type: OID_PKCS9_SIGNING_CERTIFICATE_V2_KEY,
          values: [new asn1js.Sequence({ value: [signingCert.toSchema()] })],
        }),
      ],
    });

    /* istanbul ignore next */
    const signedData = new pkijs.SignedData({
      version: 1,
      encapContentInfo: encapContent,
      certificates: includeCerts ? [this.intCert] : undefined,
      signerInfos: [
        new pkijs.SignerInfo({
          version: 1,
          signedAttrs: signedAttrs,
          sid: new pkijs.IssuerAndSerialNumber({
            issuer: this.intCert.issuer,
            serialNumber: this.intCert.serialNumber,
          }),
        }),
      ],
    });

    // Sign the SignedData structure
    await signedData.sign(
      this.keyPair.privateKey,
      0,
      SIGNED_DATA_DIGEST_ALGORITHM,
      undefined,
      this.crypto
    );

    return signedData;
  }
}
