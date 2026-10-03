// Real, client-side OCR for the product-code label photo. Uses Tesseract.js
// (free, runs entirely in the browser — no paid API, no server upload) to read
// whatever text is printed/woven on the inner label, so the scan-first step can
// show an instant, genuine catalog match guess instead of a fake timer.
//
// Tesseract (and its WASM core) is imported lazily: it's only fetched the
// first time someone actually scans a label, so it never weighs down the
// initial page load for the 99% of visits that just browse.
let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('eng'))
      .catch((e) => {
        workerPromise = null;
        throw e;
      });
  }
  return workerPromise;
}

export async function readLabelText(dataUrl) {
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  return (data.text || '').trim();
}
