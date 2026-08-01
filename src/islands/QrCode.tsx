import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a QR code for a link, generated client-side (no third party). When
 * `downloadLabel` is set, a download link is shown beneath it (the PNG data URL
 * is already in hand, so saving it is free).
 */
export default function QrCode({
  value,
  size = 168,
  downloadLabel,
  downloadName = 'mapswitch-qr.png',
}: {
  value: string;
  size?: number;
  downloadLabel?: string;
  downloadName?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) return null;
  return (
    <span className="flex flex-col items-center gap-1.5">
      <img src={src} width={size} height={size} alt="QR code" className="rounded-lg bg-white p-2" />
      {downloadLabel && (
        <a href={src} download={downloadName} className="text-xs text-accent hover:underline">
          {downloadLabel}
        </a>
      )}
    </span>
  );
}
