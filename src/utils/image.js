// Client-side photo helper for the guided upload step.
// Re-encodes the photo onto a canvas (which both compresses it and naturally strips
// EXIF metadata, including GPS location), and runs a lightweight heuristic check for
// resolution and blur so the UI can warn the user before they submit a bad photo.

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Downsampled grayscale variance-of-Laplacian: a standard, simple sharpness estimate.
// Low variance ~= flat/blurry image, high variance ~= lots of crisp edges.
function sharpnessVariance(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
  }
  let sum = 0,
    sumSq = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export async function analyzeAndCompress(file, opts = {}) {
  const { maxDim = 1600, quality = 0.86, minShortSide = 640, blurThreshold = 18 } = opts;
  const objectUrl = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Measure sharpness on a small probe canvas for speed.
  const probe = document.createElement('canvas');
  const pScale = Math.min(1, 240 / Math.max(width, height));
  const pw = Math.max(8, Math.round(width * pScale));
  const ph = Math.max(8, Math.round(height * pScale));
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext('2d');
  pctx.drawImage(canvas, 0, 0, pw, ph);
  const variance = sharpnessVariance(pctx, pw, ph);

  const dataUrl = canvas.toDataURL('image/jpeg', quality); // re-encoding strips EXIF/GPS
  const shortSide = Math.min(img.naturalWidth, img.naturalHeight);

  return {
    dataUrl,
    width,
    height,
    lowRes: shortSide < minShortSide,
    blurry: variance < blurThreshold
  };
}
