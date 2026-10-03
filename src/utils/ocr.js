// Real, client-side OCR for the product-code label photo. Uses Tesseract.js
// (free, runs entirely in the browser — no paid API, no server upload) to read
// whatever text is printed/woven on the inner label, so the scan-first step can
// show an instant, genuine catalog match guess instead of a fake timer.
import { createWorker } from 'tesseract.js';

let workerPromise = null;
function getWorker() {
  if (!workerPromise) workerPromise = createWorker('eng');
  return workerPromise;
}

export async function readLabelText(dataUrl) {
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  return (data.text || '').trim();
}
