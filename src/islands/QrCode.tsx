import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR code for a link, generated client-side (no third party). */
export default function QrCode({ value, size = 168 }: { value: string; size?: number }) {
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
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className="self-start rounded-lg bg-white p-2"
    />
  );
}
