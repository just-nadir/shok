import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverSendOtp, driverVerifyOtp, ApiError } from '../services/api';

type Step = 'phone' | 'otp';

export default function DriverLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    if (!phone.trim()) { setError("Telefon raqamini kiriting"); return; }
    setLoading(true); setError('');
    try {
      await driverSendOtp(phone.trim());
      setStep('otp');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) setError("Bu telefon raqam tizimda topilmadi");
        else if (err.status === 423) setError("Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring");
        else setError(err.message || 'Xatolik yuz berdi');
      } else setError('Xatolik yuz berdi');
    } finally { setLoading(false); }
  }, [phone]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 4) { setError("4 xonali kodni kiriting"); return; }
    setLoading(true); setError('');
    try {
      await driverVerifyOtp(phone.trim(), otp);
      navigate('/driver/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError("Kod noto'g'ri yoki muddati o'tgan");
        else if (err.status === 423) setError("Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring");
        else setError(err.message || 'Xatolik yuz berdi');
      } else setError('Xatolik yuz berdi');
    } finally { setLoading(false); }
  }, [phone, otp, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Haydovchi Paneli</h1>
          <p className="text-sm text-white/60 mt-1">
            {step === 'phone' ? 'Telefon raqamingizni kiriting' : 'SMS kodni kiriting'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {step === 'phone' ? (
            <div>
              <label className="block text-sm text-white/70 mb-1">Telefon raqam</label>
              <input
                type="tel"
                placeholder="+998901234567"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') void handleSend(); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
                disabled={loading}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-white/70 mb-1">
                {phone} raqamiga yuborilgan kod
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="----"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') void handleVerify(); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-white/30 focus:outline-none focus:border-yellow-400"
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={() => void (step === 'phone' ? handleSend() : handleVerify())}
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
            {step === 'phone' ? 'Kod olish' : 'Kirish'}
          </button>

          {step === 'otp' && (
            <button
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="text-sm text-white/40 text-center hover:text-white/60"
            >
              ← Raqamni o'zgartirish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
