// Detached PKCS#7 signature of manifest.json with the Pass Type ID
// certificate, chained to Apple's WWDR intermediate — what Wallet checks
// before it accepts a pass. node-forge is passed in, so the same code runs
// in the edge function (npm:node-forge) and in the unit tests.
// deno-lint-ignore no-explicit-any
type Forge = any;

export interface SigningMaterial {
  certPem: string;
  keyPem: string;
  keyPassphrase?: string;
  wwdrPem: string;
}

export function signManifest(forge: Forge, manifest: string, m: SigningMaterial): Uint8Array {
  const cert = forge.pki.certificateFromPem(m.certPem);
  const wwdr = forge.pki.certificateFromPem(m.wwdrPem);
  const key = m.keyPassphrase ? forge.pki.decryptRsaPrivateKey(m.keyPem, m.keyPassphrase) : forge.pki.privateKeyFromPem(m.keyPem);
  if (!key) throw new Error("pass signing key could not be read");

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, "utf8");
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  const der: string = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Uint8Array.from(der, (ch) => ch.charCodeAt(0));
}
