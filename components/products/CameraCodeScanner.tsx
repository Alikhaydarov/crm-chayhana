"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

type Props = { open: boolean; onClose: () => void; onDetected: (code: string) => void };

export function CameraCodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState("");

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    detectedRef.current = false;

    const start = async () => {
      try {
        setError("");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 180 });
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result || cancelled || detectedRef.current) return;
            const code = result.getText().trim();
            if (!code) return;
            detectedRef.current = true;
            onDetectedRef.current(code);
          },
        );
      } catch (cameraError) {
        if (cancelled) return;
        const name = cameraError instanceof DOMException ? cameraError.name : "";
        setError(name === "NotAllowedError" ? "Kameraga ruxsat berilmadi. Brauzer sozlamasidan ruxsat bering." : "Kamerani ochib bo'lmadi. HTTPS va kamera ruxsatini tekshiring.");
      }
    };

    start();
    return () => {
      cancelled = true;
      controls?.stop();
      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!open) return null;
  return <div className="camera-scanner">
    <div className="camera-scanner-head"><span><Camera size={16} /> Kodni ramka ichiga olib keling</span><button type="button" onClick={onClose} aria-label="Kamerani yopish"><X size={18} /></button></div>
    <div className="camera-preview"><video ref={videoRef} muted playsInline /><div className="camera-frame"><span /></div></div>
    {error && <div className="camera-error">{error}</div>}
  </div>;
}
