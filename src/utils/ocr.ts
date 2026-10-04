// Real, client-side OCR for the product-code label photo. Uses Tesseract.js
// (free, runs entirely in the browser — no paid API, no server upload).
//
// Tesseract (and its WASM core) is imported lazily: it's only fetched the
// first time someone actually scans a label, so it never weighs down the
// initial page load for the 99% of visits that just browse.
import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('eng'))
      .catch((e: unknown) => {
        workerPromise = null;
        throw e;
      });
  }
  return workerPromise;
}

export async function readLabelText(dataUrl: string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  return (data.text || '').trim();
}
