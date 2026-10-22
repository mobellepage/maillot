// The Apple Wallet card for a Maillot certificate of authenticity: what goes
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

/** pass.json: a generic pass in Maillot colours with a QR code to the public certificate page. */
export function buildPassJson(c: CertificateInfo, cfg: PassConfig) {
  const verifyUrl = `${cfg.siteUrl.replace(/\/$/, "")}/verify/${encodeURIComponent(c.code)}`;
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
    serialNumber: c.code,
    organizationName: "Maillot",
    description: `Maillot certificate of authenticity — ${c.shirtName}`,
    logoText: "Maillot",
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
        { key: "checks", label: "Inspection", value: `${c.checksPassed} checks passed in the Maillot authentication.` },
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

// ---------------------------------------------------------------------------
// The collector card: one shirt of a member's collection as a store card —
// the app draws the strip picture (the shirt on its colours, with a sheen);
// the fields say what it is, the QR code opens it on Maillot.
// ---------------------------------------------------------------------------
export interface CollectionCardInfo {
  itemId: string;
  shirtName: string;
  subtitle: string;
  size: string | null;
  print: string | null;
  version: string | null;
  grade: number | null;
  handle: string | null;
  addedAt: string;
  /** Background colour of the card, "rgb(r, g, b)". */
  background: string;
}

export function buildCollectionPassJson(c: CollectionCardInfo, cfg: PassConfig) {
  const site = cfg.siteUrl.replace(/\/$/, "");
  const url = c.handle ? `${site}/u/${encodeURIComponent(c.handle)}/${encodeURIComponent(c.itemId)}` : site;
  const aux = [
    ...(c.size ? [{ key: "size", label: "SIZE", value: c.size }] : []),
    ...(c.print ? [{ key: "print", label: "PRINT", value: c.print }] : []),
    ...(c.version ? [{ key: "version", label: "VERSION", value: c.version }] : []),
    ...(c.grade !== null ? [{ key: "grade", label: "CONDITION", value: `${c.grade}/10` }] : []),
  ];
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
    serialNumber: `card-${c.itemId}`,
    organizationName: "Maillot",
    description: `Maillot collector card — ${c.shirtName}`,
    logoText: "Maillot",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: c.background,
    labelColor: "rgb(235, 240, 236)",
    sharingProhibited: false,
    storeCard: {
      headerFields: c.handle ? [{ key: "owner", label: "COLLECTION", value: "@" + c.handle }] : [],
      primaryFields: [{ key: "shirt", label: c.subtitle.toUpperCase(), value: c.shirtName }],
      secondaryFields: aux.slice(0, 2),
      auxiliaryFields: aux.slice(2),
      backFields: [
        { key: "added", label: "In the collection since", value: `${date(c.addedAt)}T00:00:00Z`, dateStyle: "PKDateStyleLong", isRelative: false },
        { key: "open", label: "On Maillot", value: url, attributedValue: `<a href="${url}">${url}</a>` },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: url, messageEncoding: "iso-8859-1", altText: c.handle ? "@" + c.handle : "maillot.app" }],
  };
}

/** "#RRGGBB" → "rgb(r, g, b)", darkened so white text stays readable. */
export function passColor(hex: string | null | undefined): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
  if (!m) return "rgb(10, 12, 11)";
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x!, 16));
  const lum = (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
  const f = lum > 0.45 ? 0.45 / lum : 1;
  return `rgb(${Math.round(r! * f)}, ${Math.round(g! * f)}, ${Math.round(b! * f)})`;
}
