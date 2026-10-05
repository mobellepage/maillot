// Carriers we accept tracking numbers for, how to recognise their codes, and
// where to follow a parcel. Detection is a convenience — the seller can
// always pick the carrier by hand.
export const CARRIERS = {
  post: { name: 'Swiss Post', track: (c: string) => `https://service.post.ch/ekp-web/ui/entry/search/${c}` },
  dhl: { name: 'DHL', track: (c: string) => `https://www.dhl.com/ch-en/home/tracking.html?tracking-id=${c}` },
  dpd: { name: 'DPD', track: (c: string) => `https://www.dpdgroup.com/ch/mydpd/my-parcels/incoming?parcelNumber=${c}` },
  ups: { name: 'UPS', track: (c: string) => `https://www.ups.com/track?tracknum=${c}` },
  gls: { name: 'GLS', track: (c: string) => `https://gls-group.com/CH/en/parcel-tracking?match=${c}` },
  other: { name: 'Other', track: null }
} as const;

export type Carrier = keyof typeof CARRIERS;
export const CARRIER_IDS = Object.keys(CARRIERS) as Carrier[];

/** Tracking codes are typed with spaces and dots; carriers want them bare. */
export function normalizeTracking(code: string): string {
  return code.replace(/[\s.-]/g, '').toUpperCase();
}

export function detectCarrier(raw: string): Carrier | null {
  const c = normalizeTracking(raw);
  if (!c) return null;
  if (/^99\d{16}$/.test(c)) return 'post'; // Swiss Post domestic (99.xx.xxxxxx.xxxxxxxx)
  if (/^[A-Z]{2}\d{9}CH$/.test(c)) return 'post'; // UPU S10 posted in Switzerland
  if (/^1Z[0-9A-Z]{16}$/.test(c)) return 'ups';
  if (/^(JJD|JVGL)[0-9A-Z]{8,}$/.test(c) || /^\d{10}$/.test(c)) return 'dhl';
  if (/^\d{14}$/.test(c)) return 'dpd';
  if (/^\d{11,12}$/.test(c)) return 'gls';
  return null;
}

export function trackingUrl(carrier: string | null | undefined, code: string | null | undefined): string | null {
  if (!code) return null;
  const id = (carrier && carrier in CARRIERS ? carrier : detectCarrier(code)) as Carrier | null;
  const track = id ? CARRIERS[id].track : null;
  return track ? track(encodeURIComponent(normalizeTracking(code))) : null;
}

export function carrierName(carrier: string | null | undefined): string {
  return carrier && carrier in CARRIERS ? CARRIERS[carrier as Carrier].name : 'Carrier';
}
