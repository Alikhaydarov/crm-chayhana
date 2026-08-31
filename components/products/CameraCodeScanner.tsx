"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, RefreshCw, X } from "lucide-react";

type Props = { open: boolean; onClose: () => void; onDetected: (code: string) => void };

export function CameraCodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    let activeStream: MediaStream | undefined;
    detectedRef.current = false;

    const start = async () => {
      try {
        setError("");
        setStarting(true);
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("UNSUPPORTED_CAMERA");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 180 });
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        } catch (preferredCameraError) {
          const name = preferredCameraError instanceof DOMException ? preferredCameraError.name : "";
          if (name === "NotAllowedError" || name === "SecurityError") throw preferredCameraError;
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled || !videoRef.current) { activeStream.getTracks().forEach((track) => track.stop()); return; }
        controls = await reader.decodeFromStream(
          activeStream,
          videoRef.current,
          (result) => {
            if (!result || cancelled || detectedRef.current) return;
            const code = result.getText().trim();
            if (!code) return;
            detectedRef.current = true;
            onDetectedRef.current(code);
          },
        );
        setStarting(false);
      } catch (cameraError) {
        if (cancelled) return;
        setStarting(false);
        const name = cameraError instanceof DOMException ? cameraError.name : "";
        const message = cameraError instanceof Error ? cameraError.message : "";
        setError(name === "NotAllowedError" || name === "SecurityError" ? "Kameraga ruxsat berilmadi. Brauzer manzilidagi qulf belgisidan Camera ruxsatini yoqing." : message === "UNSUPPORTED_CAMERA" ? "Bu brauzer live kamerani qo'llamaydi. Pastdagi 'Suratdan o'qish' tugmasidan foydalaning." : "Kamerani ochib bo'lmadi. Qayta urining yoki suratdan o'qing.");
      }
    };

    start();
    return () => {
      cancelled = true;
      controls?.stop();
      activeStream?.getTracks().forEach((track) => track.stop());
      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [open, retryKey]);

  const decodeImage = async (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      setError("");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      const code = result.getText().trim();
      if (!code) throw new Error("Kod topilmadi");
      onDetectedRef.current(code);
    } catch {
      setError("Rasmda QR yoki shtrix-kod topilmadi. Kodni yaqinroq va tiniqroq suratga oling.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  if (!open) return null;
  return <div className="camera-scanner">
    <div className="camera-scanner-head"><span><Camera size={16} /> Kodni ramka ichiga olib keling</span><button type="button" onClick={onClose} aria-label="Kamerani yopish"><X size={18} /></button></div>
    <div className="camera-preview"><video ref={videoRef} muted playsInline autoPlay disablePictureInPicture /><div className="camera-frame"><span /></div>{starting && <div className="camera-starting">Kamera ishga tushmoqda...</div>}</div>
    {error && <div className="camera-error">{error}</div>}
    <div className="camera-actions">
      <button type="button" className="btn-ghost" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw size={15} /> Qayta urinish</button>
      <label className="btn-ghost"><ImageIcon size={15} /> Suratdan o'qish<input type="file" accept="image/*" capture="environment" onChange={(event) => decodeImage(event.target.files?.[0])} hidden /></label>
    </div>
  </div>;
}
