// The Apple Wallet card for a MAILLOT certificate of authenticity: what goes
// into pass.json and the manifest. Pure TypeScript using Web Crypto, so the
// app's unit tests cover it (src/__tests__/walletPass.test.js).

export interface CertificateInfo {
  code: string;
  shirtName: string;
  club: string;
  season: string;
  size: string | null;
  issuedAt: string;
  revoked: boolean;
  checksPassed: number;
}

export interface PassConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  siteUrl: string;
}

const date = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** pass.json: a generic pass in MAILLOT colours with a QR code to the public certificate page. */
export function buildPassJson(c: CertificateInfo, cfg: PassConfig) {
  const verifyUrl = `${cfg.siteUrl.replace(/\/$/, "")}/verify/${encodeURIComponent(c.code)}`;
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
    serialNumber: c.code,
    organizationName: "MAILLOT",
    description: `MAILLOT certificate of authenticity — ${c.shirtName}`,
    logoText: "MAILLOT",
    foregroundColor: "rgb(242, 244, 241)",
    backgroundColor: "rgb(10, 12, 11)",
    labelColor: "rgb(75, 255, 139)",
    // A revoked certificate stays in Wallet but is shown as void.
    voided: c.revoked,
    sharingProhibited: false,
    generic: {
      primaryFields: [{ key: "shirt", label: c.revoked ? "REVOKED" : "AUTHENTICATED", value: c.shirtName }],
      secondaryFields: [
        { key: "club", label: "CLUB", value: c.club },
        { key: "season", label: "SEASON", value: c.season },
      ],
      auxiliaryFields: [
        ...(c.size ? [{ key: "size", label: "SIZE", value: c.size }] : []),
        { key: "issued", label: "INSPECTED", value: `${date(c.issuedAt)}T00:00:00Z`, dateStyle: "PKDateStyleMedium", isRelative: false },
      ],
      backFields: [
        { key: "code", label: "Certificate", value: c.code },
        { key: "checks", label: "Inspection", value: `${c.checksPassed} checks passed at the MAILLOT authentication centre in Zürich.` },
        { key: "verify", label: "Verify", value: verifyUrl, attributedValue: `<a href="${verifyUrl}">${verifyUrl}</a>` },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: verifyUrl, messageEncoding: "iso-8859-1", altText: c.code }],
  };
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** manifest.json: SHA-1 of every file in the pass (Apple's required format). */
export async function buildManifest(files: Record<string, Uint8Array>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    out[name] = hex(await crypto.subtle.digest("SHA-1", new Uint8Array(bytes)));
  }
  return out;
}

/** Certificate codes as issued (MLT-XXXX-XXXX-XXXX); anything else is refused before a lookup. */
export const CODE = /^MLT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
