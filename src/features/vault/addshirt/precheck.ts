// Automatic pre-check for a new collection item: pure, no I/O, unit-tested.
import type { Precheck } from '../../../types/domain.ts';
import type { AddShirtForm } from './useAddShirtForm.ts';

// Below this word-overlap confidence a scan is "found some text" rather than a match.
export const SCAN_AUTO_MATCH_THRESHOLD = 0.34;

type Input = Pick<AddShirtForm, 'photos' | 'scan' | 'catalogId' | 'version' | 'proposed'>;

/** Pure pre-check from real signals (OCR match, photo sharpness, plausibility). Unit-testable. */
export function precheck(s: Input): Precheck {
  const notes: string[] = [];
  let status: Precheck['status'] = 'ok';
  const code = s.photos.product_code;
  if (!code || code.lowRes) {
    notes.push('Artikelnummer auf dem Innenetikett ist nicht klar genug lesbar.');
    status = 'review';
  }
  if (code && code.blurry) {
    notes.push('Foto des Artikelnummer-Etiketts wirkt unscharf.');
    status = 'review';
  }
  if (!s.scan.ocrText) {
    notes.push('Automatische Texterkennung konnte auf dem Etikett keinen Text finden — wird manuell geprüft.');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId === s.catalogId && s.scan.confidence < SCAN_AUTO_MATCH_THRESHOLD) {
    notes.push('Erkannter Text auf dem Etikett stimmt nur schwach mit dem gewählten Katalogartikel überein.');
    status = 'review';
  } else if (s.catalogId && s.scan.matchId && s.scan.matchId !== s.catalogId && s.scan.confidence >= SCAN_AUTO_MATCH_THRESHOLD) {
    // Strongest single fraud signal: the label confidently matches a *different*
    // catalogue item than the one selected (mislabelled or swapped label).
    notes.push('Das Etikett passt mit hoher Sicherheit zu einem anderen Katalogartikel als dem ausgewählten — mögliche Fehlzuordnung oder Fälschung.');
    status = 'fake';
  }
  if (Object.values(s.photos).some((p) => p.blurry) && status === 'ok') {
    notes.push('Mindestens ein Pflichtfoto ist unscharf.');
    status = 'review';
  }
  if (s.version === 'Player-Issue / Authentic' && !s.photos.flock_closeup) {
    notes.push('Player-Issue angegeben, aber kein Flock-Detailfoto vorhanden.');
    status = 'review';
  }
  if (!s.catalogId && s.proposed) notes.push('Dieses Trikot ist noch nicht im Katalog — der Vorschlag wird manuell geprüft.');
  if (notes.length >= 3) status = 'fake';
  if (!notes.length) notes.push('Keine Auffälligkeiten bei Artikelnummer, Fotoqualität und Plausibilität.');
  return { status, notes };
}

