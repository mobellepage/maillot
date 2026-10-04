// Static reference data + pure helpers for the "Trikot hinzufügen" (Add Shirt) flow.
// Kept separate from data.js (the market/catalogue data) since this is specific to
// the self-cataloguing wizard.
import { SHIRTS } from './data.ts';
import { MARKET_DATA_LABEL } from './marketData.ts';

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

// Turns raw OCR text from the product-code label photo into a best-guess catalog
// match, using the same word-overlap approach as the manual search box. This is a
// real (if imperfect) text match against actual catalog data — not a simulated result.
export function matchCatalogFromOcrText(text) {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüéèê]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (!words.length) return { item: null, confidence: 0, words };

  let best = null;
  let bestHits = 0;
  for (const s of SHIRTS) {
    const hits = words.filter((w) => s.hay.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = s;
    }
  }
  if (!best || bestHits === 0) return { item: null, confidence: 0, words };
  const confidence = Math.max(0, Math.min(1, bestHits / Math.max(2, words.length * 0.5)));
  return { item: best, confidence, words };
}

export const CONDITION_SCALE = [
  { grade: 10, label: 'Neuwertig mit Etikett', desc: 'Ungetragen, Hangtag (BNWT) vollständig vorhanden.' },
  { grade: 9, label: 'Neuwertig', desc: 'Ungetragen oder einmal anprobiert, keine sichtbaren Mängel.' },
  { grade: 8, label: 'Sehr gut', desc: 'Leicht getragen, Flock und Logos vollständig intakt.' },
  { grade: 7, label: 'Gut', desc: 'Normale Gebrauchsspuren, keine Löcher oder Flecken.' },
  { grade: 6, label: 'Gut mit kleinen Mängeln', desc: 'Leichte Abnutzung an Flock oder Stoff erkennbar.' },
  { grade: 5, label: 'Durchschnittlich', desc: 'Sichtbare Gebrauchsspuren, evtl. ein kleiner Fleck.' },
  { grade: 4, label: 'Gebraucht', desc: 'Deutliche Abnutzung, Flock evtl. angerissen.' },
  { grade: 3, label: 'Stark gebraucht', desc: 'Mehrere Mängel, z. B. Flecken oder verblasster Druck.' },
  { grade: 2, label: 'Schlecht', desc: 'Löcher, starke Flecken oder angerissene Nähte.' },
  { grade: 1, label: 'Defekt', desc: 'Stark beschädigt, nur noch Sammlerwert als Ersatzteil.' }
];

export const DEFECTS = ['Flock rissig/abblätternd', 'Sponsor abgerieben', 'Flecken', 'Löcher', 'Ausgeblichen'];

export const VISIBILITIES = [
  { key: 'private', label: 'Privat', desc: 'Nur du siehst dieses Trikot.' },
  { key: 'public', label: 'In meiner öffentlichen Sammlung', desc: 'Andere Sammler können es in deinem Profil sehen.' },
  { key: 'offers', label: 'Offen für Angebote', desc: 'Du kannst unverbindliche Angebote erhalten.' },
  { key: 'forsale', label: 'Zum Verkauf', desc: 'Mit Preis im Marktplatz gelistet.' }
];

// Builds the exact list of photos required for this specific shirt, in the order
// they should be captured. Base 7 are always required; the rest depend on what the
// collector entered in Schritt 2.
export function buildPhotoSpecs(f) {
  const specs = [
    { key: 'front', label: 'Front komplett', hint: 'Flach ausgelegt, das ganze Trikot im Bild.' },
    { key: 'back', label: 'Rücken komplett', hint: 'Inkl. Flock, falls vorhanden.' },
    { key: 'crest', label: 'Vereinswappen / Logo', hint: 'Nahaufnahme, scharf und zentriert.' },
    { key: 'sponsor', label: 'Ausrüster-Logo & Sponsor', hint: 'Beide Logos gut lesbar im Bild.' },
    { key: 'collar', label: 'Innenetikett (Grösse)', hint: 'Grössenangabe im Kragen.' },
    { key: 'product_code', label: 'Etikett mit Artikelnummer', hint: 'Wichtigstes Echtheitsmerkmal — bitte klar lesbar fotografieren.' },
    { key: 'seams', label: 'Nähte / Innenverarbeitung', hint: 'Verarbeitung von innen.' }
  ];
  if (f.flock.source !== 'Keine') {
    specs.push({ key: 'flock_closeup', label: 'Flock Nahaufnahme', hint: 'Name & Nummer scharf erkennbar.' });
  }
  f.patches.forEach((p) => {
    specs.push({ key: 'patch_' + p, label: 'Patch: ' + p, hint: 'Nahaufnahme dieses Patches.' });
  });
  if (f.signature.signed) {
    specs.push({ key: 'signature_closeup', label: 'Signatur Nahaufnahme', hint: 'Unterschrift scharf und vollständig im Bild.' });
    if (f.signature.hasCoa) {
      specs.push({ key: 'coa_front', label: 'Echtheitszertifikat (Vorderseite)', hint: '' });
      specs.push({ key: 'coa_back', label: 'Echtheitszertifikat (Rückseite)', hint: '' });
    }
  }
  if (f.tagsAttached) {
    specs.push({ key: 'hangtag', label: 'Anhänger (BNWT)', hint: 'Preisschild/Hangtag sichtbar.' });
  }
  f.condition.defects.forEach((d) => {
    specs.push({ key: 'defect_' + d, label: 'Mangel: ' + d, hint: 'Nahaufnahme der betroffenen Stelle.' });
  });
  if (f.version === 'Match-Issued' || f.version === 'Match-Worn') {
    specs.push({ key: 'provenance_doc', label: 'Herkunftsnachweis', hint: 'Vereinszertifikat, Auktionsbeleg o. Ä.' });
  }
  return specs;
}

const VERSION_MULT = {
  'Fan-Replica': 1.0,
  'Player-Issue / Authentic': 1.45,
  'Match-Issued': 2.1,
  'Match-Worn': 3.2,
  Unbekannt: 0.85
};

const VERIFY_MULT = { self: 1, precheck: 1.05, expert: 1.18 };

// Pure valuation estimate. Never claims a definitive authenticity guarantee —
// returns an honest range + confidence label, and explicitly blocks the estimate
// for Match-Worn shirts until an expert has verified them.
export function estimateValue({ catalogItem, version, conditionGrade, flock, patches, signature, verificationLevel }) {
  if (version === 'Match-Worn' && verificationLevel !== 'expert') {
    return { blocked: true, reason: 'Für Match-Worn-Trikots zeigen wir erst nach erfolgreicher Experten-Verifizierung eine Wertschätzung.' };
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
  const basisText = catalogItem
    ? 'Basiert auf ' + salesCount + ' Verkäufen in den letzten 12 Monaten · Katalogartikel · ' + MARKET_DATA_LABEL
    : 'Basiert auf einer groben Schätzung — dieses Trikot ist noch nicht im Katalog.';

  return { blocked: false, low, mid, high, confidence, basisText };
}
