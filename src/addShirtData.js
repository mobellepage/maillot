import { VERSIONS as VERSION_RULES } from './config/rules.ts';
// Static reference data + pure helpers for the Add Shirt flow. Option values
// (versions, sleeves, flock, defects, patches) are stored as they are here and
// translated for display through opt.<value> messages.
// Kept separate from data.js (the market/catalogue data) since this is specific to
// the self-cataloguing wizard.
export const VERSIONS = ['Fan-Replica', 'Player-Issue / Authentic', 'Match-Issued', 'Match-Worn', 'Unbekannt'];

export const SLEEVES = ['Kurzarm', 'Langarm'];

export const SIZE_GROUPS = {
  Herren: ['S', 'M', 'L', 'XL', 'XXL'],
  Damen: ['XS', 'S', 'M', 'L', 'XL'],
  Kinder: ['116', '128', '140', '152', '164']
};

export const FLOCK_SOURCES = ['Keine', 'Spielername & Nummer', 'Eigener Name'];
export const FLOCK_TYPES = ['Original (vom Verein)', 'Nachträglich bedruckt', 'Unbekannt'];

export const PATCH_LIBRARY = {
  'National Teams': ['Weltmeisterschaft', 'Europameisterschaft', 'Nations League'],
  'Premier League': ['Premier League Patch', 'EFL Cup'],
  'La Liga': ['LaLiga Patch'],
  'Serie A': ['Serie A Patch', 'Coppa Italia'],
  Bundesliga: ['Bundesliga Patch', 'DFB-Pokal'],
  'Ligue 1': ['Ligue 1 Patch'],
  'Swiss Super League': ['Super League Patch'],
  Eredivisie: ['Eredivisie Patch'],
  MLS: ['MLS Patch'],
  'Liga Profesional': ['Copa Libertadores'],
  _generic: ['Champions League', 'Europa League', 'Final-Patch']
};

export function patchOptionsFor(league) {
  const specific = (league && PATCH_LIBRARY[league]) || [];
  return [...specific, ...PATCH_LIBRARY._generic];
}

// label/desc are message keys (as.grade.N / as.grade.N.desc).
export const CONDITION_SCALE = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((grade) => ({ grade, label: 'as.grade.' + grade, desc: 'as.grade.' + grade + '.desc' }));

export const DEFECTS = ['Flock rissig/abblätternd', 'Sponsor abgerieben', 'Flecken', 'Löcher', 'Ausgeblichen'];

// label/desc are message keys.
export const VISIBILITIES = ['private', 'public', 'offers', 'forsale'].map((key) => ({ key, label: 'vault.vis.' + key, desc: 'as.vis.' + key + '.desc' }));

// Builds the list of photos for this specific shirt, in the order they should
// be captured. Front and back are all a shirt in the collection needs
// (COLLECTION_PHOTOS) — enough to receive offers, too. Putting it up for sale
// at a price also needs the badge, the inner label and, if the shirt has one, the print
// (salePhotoKeys); those are marked `forSale`. The rest are optional extras
// that help the pre-check and depend on what the collector entered in the
// details step. `t` translates the labels (the label is stored with the
// photo, so it's in the language the collector used).
export const COLLECTION_PHOTOS = ['front', 'back'];
const SALE_PHOTOS = ['front', 'back', 'crest', 'flock_closeup', 'product_code'];
const hasPrint = (source) => !!source && source !== 'Keine' && source !== 'none';

/** The photos a shirt needs before it can be offered for sale. */
export function salePhotoKeys(flockSource) {
  return SALE_PHOTOS.filter((k) => k !== 'flock_closeup' || hasPrint(flockSource));
}

/** Which of those are still missing. */
export function missingSalePhotos(photos, flockSource) {
  return salePhotoKeys(flockSource).filter((k) => !photos?.[k]);
}

/** Only a shirt put up for sale at a price needs those photos; offers work with front and back. */
export const needsSalePhotos = (v) => v === 'forsale';

export function buildPhotoSpecs(f, t = (k) => k) {
  const sale = salePhotoKeys(f.flock.source);
  const spec = (key, msg = key, vars) => ({ key, label: t('as.photo.' + msg, vars), hint: t('as.photo.' + msg + '.hint', vars), required: COLLECTION_PHOTOS.includes(key), forSale: !COLLECTION_PHOTOS.includes(key) && sale.includes(key) });
  const specs = ['front', 'back', 'crest'].map((k) => spec(k));
  if (hasPrint(f.flock.source)) specs.push(spec('flock_closeup'));
  specs.push(spec('product_code'));
  ['sponsor', 'collar', 'seams'].forEach((k) => specs.push(spec(k)));
  f.patches.forEach((p) => specs.push(spec('patch_' + p, 'patch', { name: t('opt.' + p) === 'opt.' + p ? p : t('opt.' + p) })));
  if (f.signature.signed) {
    specs.push(spec('signature_closeup'));
    if (f.signature.hasCoa) specs.push({ ...spec('coa_front'), hint: '' }, { ...spec('coa_back'), hint: '' });
  }
  if (f.tagsAttached) specs.push(spec('hangtag'));
  f.condition.defects.forEach((d) => specs.push(spec('defect_' + d, 'defect', { name: t('opt.' + d) === 'opt.' + d ? d : t('opt.' + d) })));
  if (f.version === 'Match-Issued' || f.version === 'Match-Worn') specs.push(spec('provenance_doc'));
  return specs;
}

// The wizard's version names → the factors in config/rules.ts (VERSIONS).
const factor = (key) => VERSION_RULES.find((v) => v.key === key).factor;
const VERSION_MULT = {
  'Fan-Replica': factor('replica'),
  'Player-Issue / Authentic': factor('playerIssue'),
  'Match-Issued': factor('matchIssued'),
  'Match-Worn': factor('matchWorn'),
  Unbekannt: 0.85
};

const VERIFY_MULT = { self: 1, precheck: 1.05, expert: 1.18 };

// Pure valuation estimate. Never claims a definitive authenticity guarantee —
// returns an honest range + confidence label, and explicitly blocks the estimate
// for Match-Worn shirts until an expert has verified them.
export function estimateValue({ catalogItem, version, conditionGrade, flock, patches, signature, verificationLevel }) {
  if (version === 'Match-Worn' && verificationLevel !== 'expert') {
    return { blocked: true, reason: 'val.mwBlocked' };
  }

  const base = catalogItem ? catalogItem.price : 90;
  const salesCount = catalogItem ? catalogItem.sales.length : 0;

  let mult = VERSION_MULT[version] ?? 1;
  mult *= 0.55 + (conditionGrade / 10) * 0.6;
  if (flock.source !== 'Keine') mult *= flock.type === 'Original (vom Verein)' ? 1.12 : 1.04;
  if (patches.length) mult *= 1 + Math.min(patches.length, 3) * 0.06;
  if (signature.signed) mult *= signature.hasCoa ? 1.9 : 1.4;
  mult *= VERIFY_MULT[verificationLevel] || 1;

  const mid = Math.round(base * mult);
  const spread = catalogItem ? 0.22 : 0.4;
  const low = Math.round(mid * (1 - spread));
  const high = Math.round(mid * (1 + spread));

  let confidence = 'niedrig';
  if (catalogItem && salesCount >= 5 && verificationLevel !== 'self') confidence = 'hoch';
  else if (catalogItem && salesCount >= 2) confidence = 'mittel';

  // Audit note (Phase 4.11): "Verkäufe" here come from the catalogue's synthetic
  // market data (see marketData.js), not a real transactions feed — labelled
  // honestly rather than presented as real sales history.
  // reason/basis are message keys; confidence is a stored value (opt.*).
  const basis = catalogItem ? { key: 'val.basisCatalog', vars: { n: salesCount } } : { key: 'val.basisRough' };

  return { blocked: false, low, mid, high, confidence, basis };
}
