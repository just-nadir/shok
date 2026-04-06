import { useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendOtp, verifyOtp, ApiError } from '../services/api';

type Step = 'phone' | 'otp';

function formatPhone(raw: string): string {
  // Keep only digits
  const digits = raw.replace(/\D/g, '');
  // Format as +998 XX XXX XX XX
  if (digits.length === 0) return '';
  if (digits.startsWith('998')) {
    const local = digits.slice(3, 12);
    let result = '+998';
    if (local.length > 0) result += ' ' + local.slice(0, 2);
    if (local.length > 2) result += ' ' + local.slice(2, 5);
    if (local.length > 5) result += ' ' + local.slice(5, 7);
    if (local.length > 7) result += ' ' + local.slice(7, 9);
    return result;
  }
  // If user types without country code
  const local = digits.slice(0, 9);
  let result = '+998';
  if (local.length > 0) result += ' ' + local.slice(0, 2);
  if (local.length > 2) result += ' ' + local.slice(2, 5);
  if (local.length > 5) result += ' ' + local.slice(5, 7);
  if (local.length > 7) result += ' ' + local.slice(7, 9);
  return result;
}

function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length === 12) return '+' + digits;
  if (!digits.startsWith('998') && digits.length === 9) return '+998' + digits;
  return '+' + digits;
}

function isPhoneComplete(formatted: string): boolean {
  const digits = formatted.replace(/\D/g, '');
  return (digits.startsWith('998') && digits.length === 12) ||
    (!digits.startsWith('998') && digits.length === 9);
}

export default function OTPVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrCode = searchParams.get('qr');

  const [step, setStep] = useState<Step>('phone');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no qr param
  if (!qrCode) {
    navigate('/scan', { replace: true });
    return null;
  }

  const handlePhoneChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneDisplay(formatPhone(raw));
    setError('');
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!isPhoneComplete(phoneDisplay)) {
      setError("To'liq telefon raqamini kiriting");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(toE164(phoneDisplay));
      setStep('otp');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429 || err.status === 423) {
          setError("Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring");
        } else {
          setError(err.message || 'Xatolik yuz berdi');
        }
      } else {
        setError('Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  }, [phoneDisplay]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setError('6 xonali kodni kiriting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(toE164(phoneDisplay), otp);
      navigate(`/rate/${encodeURIComponent(qrCode)}?phone=${encodeURIComponent(toE164(phoneDisplay))}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423 || err.status === 429) {
          setError("Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring");
        } else if (err.status === 410) {
          setError("Tasdiqlash kodi muddati o'tdi. Qayta so'rang");
        } else if (err.status === 400 || err.status === 401) {
          setError("Tasdiqlash kodi noto'g'ri");
        } else {
          setError(err.message || 'Xatolik yuz berdi');
        }
      } else {
        setError('Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  }, [otp, phoneDisplay, qrCode, navigate]);

  const handleResend = useCallback(async () => {
    setOtp('');
    setError('');
    setLoading(true);
    try {
      await sendOtp(toE164(phoneDisplay));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429 || err.status === 423) {
          setError("Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring");
        } else {
          setError(err.message || 'Xatolik yuz berdi');
        }
      } else {
        setError('Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  }, [phoneDisplay]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3 3-1.343 3-3zm0 0c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3zm-6 8a6 6 0 0112 0" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Shok Taxi</h1>
          <p className="text-sm text-white/60 mt-1">
            {step === 'phone' ? 'Telefon raqamingizni kiriting' : 'SMS kodni kiriting'}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Telefon raqam</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="+998 XX XXX XX XX"
                value={phoneDisplay}
                onChange={handlePhoneChange}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSendOtp(); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 text-lg tracking-wider"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              onClick={() => void handleSendOtp()}
              disabled={loading || !isPhoneComplete(phoneDisplay)}
              className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : null}
              OTP yuborish
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">SMS kod</label>
              <p className="text-xs text-white/40 mb-2">{phoneDisplay} raqamiga yuborildi</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="------"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                  setError('');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyOtp(); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 text-2xl tracking-[0.5em] text-center"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              onClick={() => void handleVerifyOtp()}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : null}
              Tasdiqlash
            </button>

            <button
              onClick={() => void handleResend()}
              disabled={loading}
              className="text-sm text-yellow-400 underline text-center min-h-[44px] flex items-center justify-center disabled:opacity-50"
            >
              Qayta yuborish
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              disabled={loading}
              className="text-sm text-white/40 text-center min-h-[44px] flex items-center justify-center disabled:opacity-50"
            >
              ← Raqamni o'zgartirish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
