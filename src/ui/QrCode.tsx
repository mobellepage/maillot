// QR code as a single SVG path (no innerHTML). Error correction M survives a
// scuffed sticker; the quiet zone is part of the viewBox.
import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export function QrCode({ value, size = 160, label }: { value: string; size?: number; label: string }) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { d: path, n: count + 8 };
  }, [value]);
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 8 }}>
      <path d={d} fill="#000" />
    </svg>
  );
}
