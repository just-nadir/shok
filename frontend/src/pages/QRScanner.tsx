import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverByQrCode, ApiError } from '../services/api';

type ScanState = 'requesting' | 'scanning' | 'loading' | 'error' | 'unsupported' | 'denied';

export default function QRScanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  const [state, setState] = useState<ScanState>('requesting');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleQrCode = useCallback(
    async (qrCode: string) => {
      if (lastScannedRef.current === qrCode) return;
      lastScannedRef.current = qrCode;
      stopCamera();
      setState('loading');
      try {
        await getDriverByQrCode(qrCode);
        navigate(`/rate/${encodeURIComponent(qrCode)}`);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setErrorMsg('QR kod yaroqsiz yoki topilmadi');
        } else {
          setErrorMsg('Xatolik yuz berdi. Qayta urinib ko\'ring.');
        }
        setState('error');
        lastScannedRef.current = null;
      }
    },
    [navigate, stopCamera]
  );

  const startScanning = useCallback(
    (video: HTMLVideoElement, detector: BarcodeDetector) => {
      const scan = async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await detector.detect(video);
            for (const barcode of barcodes) {
              if (barcode.format === 'qr_code' && barcode.rawValue) {
                await handleQrCode(barcode.rawValue);
                return;
              }
            }
          } catch {
            // detection errors are non-fatal, keep scanning
          }
        }
        animFrameRef.current = requestAnimationFrame(scan);
      };
      animFrameRef.current = requestAnimationFrame(scan);
    },
    [handleQrCode]
  );

  useEffect(() => {
    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setState('unsupported');
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        detectorRef.current = detector;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setState('scanning');
          startScanning(videoRef.current, detector);
        }
      } catch (err) {
        if (cancelled) return;
        const name = (err as Error).name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setState('denied');
        } else {
          setErrorMsg('Kamerani ochishda xatolik yuz berdi.');
          setState('error');
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [startScanning, stopCamera]);

  const retry = () => {
    lastScannedRef.current = null;
    setErrorMsg('');
    setState('requesting');
    // Re-mount by navigating to same page
    navigate('/scan', { replace: true });
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {/* Camera video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full min-h-screen">
        {state === 'scanning' && (
          <>
            {/* Viewfinder */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-yellow-400 opacity-80 animate-scan-line" />
            </div>
            <p className="mt-6 text-sm text-white/80 text-center px-4">
              QR kodni ramka ichiga joylashtiring
            </p>
          </>
        )}

        {state === 'requesting' && (
          <div className="flex flex-col items-center gap-4 bg-black/70 rounded-2xl p-8">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/80 text-sm">Kamera ochilmoqda...</p>
          </div>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 bg-black/70 rounded-2xl p-8">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/80 text-sm">Haydovchi ma'lumotlari yuklanmoqda...</p>
          </div>
        )}

        {state === 'denied' && (
          <div className="flex flex-col items-center gap-4 bg-black/80 rounded-2xl p-8 mx-4 text-center">
            <svg className="w-14 h-14 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-white font-semibold text-lg">Kamera ruxsatini bering</p>
            <p className="text-white/60 text-sm">
              QR kodni skanerlash uchun brauzeringizda kamera ruxsatini yoqing va qayta urinib ko'ring.
            </p>
            <button
              onClick={retry}
              className="mt-2 px-6 py-2 bg-yellow-400 text-black font-semibold rounded-full text-sm"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {state === 'unsupported' && (
          <div className="flex flex-col items-center gap-4 bg-black/80 rounded-2xl p-8 mx-4 text-center">
            <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-white font-semibold text-lg">Qo'llab-quvvatlanmaydi</p>
            <p className="text-white/60 text-sm">
              Kamerangiz QR skanerlashni qo'llab-quvvatlamaydi. Iltimos, zamonaviy brauzer ishlating.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 bg-black/80 rounded-2xl p-8 mx-4 text-center">
            <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-white font-semibold text-lg">{errorMsg}</p>
            <button
              onClick={retry}
              className="mt-2 px-6 py-2 bg-yellow-400 text-black font-semibold rounded-full text-sm"
            >
              Qayta urinish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
