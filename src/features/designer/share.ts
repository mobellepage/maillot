// Sharing a design: the link (share sheet on phones, clipboard elsewhere)
// and the picture as a PNG file.
import { shareOrigin } from '../../config/site.ts';

export const designUrl = (id: string) => shareOrigin() + '/design/' + id;

/** 'shared' (share sheet), 'copied' (clipboard) or 'failed'. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Saves the design's picture (front) as a PNG file. */
export async function downloadPicture(svg: SVGSVGElement, name: string): Promise<void> {
  const blob = await toPng(svg);
  const file = (name.trim() || 'maillot-kit').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() + '.png';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** The drawn design as a PNG on a light background, e.g. to share. */
export async function toPng(svg: SVGSVGElement, size = 1080, background = '#f4f5f2'): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('could not draw the design'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    const pad = size * 0.08;
    ctx.drawImage(img, pad, pad, size - 2 * pad, size - 2 * pad);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('no picture'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
