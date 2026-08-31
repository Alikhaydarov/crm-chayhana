"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, RefreshCw, X } from "lucide-react";

type Props = { open: boolean; onClose: () => void; onDetected: (code: string) => void };
type NativeBarcodeDetector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type NativeBarcodeDetectorConstructor = new (options: { formats: string[] }) => NativeBarcodeDetector;

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
    let nativeTimer: ReturnType<typeof setTimeout> | undefined;
    detectedRef.current = false;

    const complete = (code: string) => {
      const value = code.trim();
      if (!value || cancelled || detectedRef.current) return;
      detectedRef.current = true;
      navigator.vibrate?.(60);
      onDetectedRef.current(value);
    };

    const start = async () => {
      try {
        setError("");
        setStarting(true);
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("UNSUPPORTED_CAMERA");
        if (cancelled || !videoRef.current) return;
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        } catch (preferredCameraError) {
          const name = preferredCameraError instanceof DOMException ? preferredCameraError.name : "";
          if (name === "NotAllowedError" || name === "SecurityError") throw preferredCameraError;
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled || !videoRef.current) { activeStream.getTracks().forEach((track) => track.stop()); return; }
        const videoTrack = activeStream.getVideoTracks()[0];
        const capabilities = videoTrack?.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[] };
        if (capabilities?.focusMode?.includes("continuous")) {
          await videoTrack.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
        }
        const video = videoRef.current;
        video.srcObject = activeStream;
        await video.play();
        const Detector = (window as Window & { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
        if (Detector) {
          const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"] });
          let scanning = false;
          const scanNative = async () => {
            if (cancelled || detectedRef.current) return;
            if (!scanning && video.readyState >= 2) {
              scanning = true;
              try {
                const result = await detector.detect(video);
                const code = result.find((item) => item.rawValue)?.rawValue;
                if (code) complete(code);
              } catch {} finally { scanning = false; }
            }
            if (!cancelled && !detectedRef.current) nativeTimer = setTimeout(scanNative, 50);
          };
          setStarting(false);
          nativeTimer = setTimeout(scanNative, 0);
          controls = { stop: () => { if (nativeTimer) clearTimeout(nativeTimer); } };
          return;
        }

        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 35, delayBetweenScanSuccess: 300 });
        controls = await reader.decodeFromStream(
          activeStream,
          videoRef.current,
          (result) => {
            if (result) complete(result.getText());
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
      if (nativeTimer) clearTimeout(nativeTimer);
      controls?.stop();
      activeStream?.getTracks().forEach((track) => track.stop());
      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [open, retryKey]);

  const decodeImage = async (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let bitmap: ImageBitmap | undefined;
    try {
      setError("");
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      let code = "";
      try { code = (await reader.decodeFromImageUrl(url)).getText().trim(); } catch {}
      if (!code) {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas ishlamadi");
        const scales = [0.8, 0.65, 0.5];
        const verticalOffsets = [0, 0.14, -0.14];
        scan: for (const scale of scales) {
          const cropWidth = Math.round(bitmap.width * scale);
          const cropHeight = Math.round(bitmap.height * scale);
          for (const offset of verticalOffsets) {
            const sourceX = Math.max(0, Math.round((bitmap.width - cropWidth) / 2));
            const sourceY = Math.max(0, Math.min(bitmap.height - cropHeight, Math.round((bitmap.height - cropHeight) / 2 + bitmap.height * offset)));
            const zoom = Math.max(1, Math.min(2, 1200 / cropWidth));
            canvas.width = Math.round(cropWidth * zoom);
            canvas.height = Math.round(cropHeight * zoom);
            context.drawImage(bitmap, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
            try {
              code = (await reader.decodeFromCanvas(canvas)).getText().trim();
              if (code) break scan;
            } catch {}
          }
        }
      }
      if (!code) throw new Error("Kod topilmadi");
      onDetectedRef.current(code);
    } catch {
      setError("Rasmda mahsulot shtrix-kodi topilmadi. Chiziqlarni tekis, yaqin va yorug' holatda suratga oling.");
    } finally {
      bitmap?.close();
      URL.revokeObjectURL(url);
    }
  };

  if (!open) return null;
  return <div className="camera-scanner">
    <div className="camera-scanner-head"><span><Camera size={16} /> Shtrix-kod chiziqlarini ramka ichiga tekis joylang</span><button type="button" onClick={onClose} aria-label="Kamerani yopish"><X size={18} /></button></div>
    <div className="camera-preview"><video ref={videoRef} muted playsInline autoPlay disablePictureInPicture /><div className="camera-frame"><span /></div>{starting && <div className="camera-starting">Kamera ishga tushmoqda...</div>}</div>
    {error && <div className="camera-error">{error}</div>}
    <div className="camera-actions">
      <button type="button" className="btn-ghost" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw size={15} /> Qayta urinish</button>
      <label className="btn-ghost"><ImageIcon size={15} /> Suratdan o'qish<input type="file" accept="image/*" capture="environment" onChange={(event) => decodeImage(event.target.files?.[0])} hidden /></label>
    </div>
  </div>;
}
