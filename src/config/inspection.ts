// The inspection checklist, versioned: a certificate stores the version it
// was inspected against ({"checklist":"v1"}), so later edits to the list
// never change what an old certificate claims.
export const INSPECTION_CHECKLIST = {
  v1: [
    'Product code on the wash tag matches the season and edition',
    'Wash-tag print, font and layout',
    'Neck and jock tags: placement, stitching, materials',
    'Club crest: embroidery or heat-press method and density',
    'Manufacturer logo: application method and alignment',
    'Fabric weight and weave pattern for the edition',
    'Seams, hems and overlock stitching',
    'Sponsor print: material, finish and placement',
    'Name and number printing: font, material, era-correct supplier',
    'Sleeve and league patches: correct for the season and competition',
    'Colours against reference photos under calibrated light',
    'Condition matches the listing (wear, marks, fading, repairs)',
    'Match-worn: provenance documents and use marks consistent with the claim',
    'Signatures: certificate of authenticity checked with the issuer'
  ]
} as const;

export type ChecklistVersion = keyof typeof INSPECTION_CHECKLIST;
