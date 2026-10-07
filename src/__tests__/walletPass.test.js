import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import forge from 'node-forge';
import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildManifest, buildPassJson, CODE } from '../../supabase/functions/wallet-pass/pass.ts';
import { signManifest } from '../../supabase/functions/wallet-pass/sign.ts';
import * as images from '../../supabase/functions/wallet-pass/images.ts';

const cert = { code: 'MLT-AB12-CD34-EF56', shirtName: 'Netherlands 1988 Home', club: 'Netherlands', season: '1988', size: 'L', issuedAt: '2026-10-05T12:00:00Z', revoked: false, checksPassed: 14 };
const cfg = { passTypeIdentifier: 'pass.ch.maillot.certificate', teamIdentifier: 'ABCDE12345', siteUrl: 'https://maillot-two.vercel.app/' };

// A throwaway CA (standing in for Apple's WWDR) and a pass certificate it signed.
function testPki() {
  const make = (subject, issuer, signKey, pub, ca) => {
    const c = forge.pki.createCertificate();
    c.publicKey = pub;
    c.serialNumber = String(Math.floor(Math.random() * 1e9));
    c.validity.notBefore = new Date(Date.now() - 864e5);
    c.validity.notAfter = new Date(Date.now() + 864e5 * 365);
    c.setSubject([{ name: 'commonName', value: subject }]);
    c.setIssuer([{ name: 'commonName', value: issuer }]);
    c.setExtensions(ca ? [{ name: 'basicConstraints', cA: true }, { name: 'keyUsage', keyCertSign: true, digitalSignature: true }] : [{ name: 'keyUsage', digitalSignature: true }]);
    c.sign(signKey, forge.md.sha256.create());
    return c;
  };
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const ca = make('Test WWDR', 'Test WWDR', caKeys.privateKey, caKeys.publicKey, true);
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const passCert = make('Pass Type ID: pass.ch.maillot.certificate', 'Test WWDR', caKeys.privateKey, keys.publicKey, false);
  return { wwdrPem: forge.pki.certificateToPem(ca), certPem: forge.pki.certificateToPem(passCert), keyPem: forge.pki.privateKeyToPem(keys.privateKey) };
}

describe('Apple Wallet certificate pass', () => {
  it('describes the certificate with a QR code to its public page', () => {
    const p = buildPassJson(cert, cfg);
    expect(p).toMatchObject({ formatVersion: 1, serialNumber: 'MLT-AB12-CD34-EF56', passTypeIdentifier: 'pass.ch.maillot.certificate', teamIdentifier: 'ABCDE12345', voided: false });
    expect(p.barcodes[0]).toMatchObject({ format: 'PKBarcodeFormatQR', message: 'https://maillot-two.vercel.app/verify/MLT-AB12-CD34-EF56' });
    expect(p.generic.primaryFields[0]).toMatchObject({ label: 'AUTHENTICATED', value: 'Netherlands 1988 Home' });
    expect(p.generic.auxiliaryFields.map((f) => f.key)).toEqual(['size', 'issued']);
  });

  it('voids the pass once the certificate is revoked', () => {
    const p = buildPassJson({ ...cert, revoked: true }, cfg);
    expect(p.voided).toBe(true);
    expect(p.generic.primaryFields[0].label).toBe('REVOKED');
  });

  it('only accepts certificate codes as issued', () => {
    expect(CODE.test('MLT-AB12-CD34-EF56')).toBe(true);
    expect(CODE.test('MLT-AB12')).toBe(false);
    expect(CODE.test("MLT-AB12-CD34-EF56'; drop")).toBe(false);
  });

  it('lists every file with its SHA-1 in the manifest', async () => {
    const m = await buildManifest({ 'pass.json': new TextEncoder().encode('{}'), 'icon.png': new Uint8Array([1, 2, 3]) });
    expect(m).toEqual({ 'icon.png': '7037807198c22a7d2b0807371d763779a84fdfcf', 'pass.json': 'bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f' });
  });

  it('ships the brand images Wallet needs', () => {
    for (const k of ['icon_png', 'icon_2x_png', 'icon_3x_png', 'logo_png', 'logo_2x_png']) expect(Buffer.from(images[k], 'base64').subarray(1, 4).toString()).toBe('PNG');
  });

  it('signs the manifest so that OpenSSL verifies it against the issuing CA', async () => {
    const pki = testPki();
    const files = { 'pass.json': new TextEncoder().encode(JSON.stringify(buildPassJson(cert, cfg))), 'icon.png': Buffer.from(images.icon_png, 'base64') };
    const manifest = JSON.stringify(await buildManifest(files));
    const signature = signManifest(forge, manifest, pki);
    const pkpass = unzipSync(zipSync({ ...files, 'manifest.json': new TextEncoder().encode(manifest), signature }));
    expect(Object.keys(pkpass).sort()).toEqual(['icon.png', 'manifest.json', 'pass.json', 'signature']);

    const dir = mkdtempSync(join(tmpdir(), 'pkpass-'));
    writeFileSync(join(dir, 'manifest.json'), pkpass['manifest.json']);
    writeFileSync(join(dir, 'signature'), pkpass.signature);
    writeFileSync(join(dir, 'wwdr.pem'), pki.wwdrPem);
    const out = execFileSync('openssl', ['cms', '-verify', '-binary', '-inform', 'DER', '-in', join(dir, 'signature'), '-content', join(dir, 'manifest.json'), '-CAfile', join(dir, 'wwdr.pem'), '-purpose', 'any', '-out', '/dev/null'], { stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toBeDefined(); // throws if verification fails
    // A tampered manifest must not verify.
    writeFileSync(join(dir, 'manifest.json'), manifest.replace('pass.json', 'pass.jsoN'));
    expect(() => execFileSync('openssl', ['cms', '-verify', '-binary', '-inform', 'DER', '-in', join(dir, 'signature'), '-content', join(dir, 'manifest.json'), '-CAfile', join(dir, 'wwdr.pem'), '-purpose', 'any', '-out', '/dev/null'], { stdio: 'ignore' })).toThrow();
  }, 30000);
});
