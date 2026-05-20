import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../services/api';
import type { Driver } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

async function getDriverByCarNumber(carNumber: string): Promise<Driver> {
  const res = await fetch(`${BASE_URL}/drivers/car/${encodeURIComponent(carNumber)}`, { credentials: 'include' });
  if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new ApiError(res.status, b.error ?? 'Xatolik'); }
  return res.json() as Promise<Driver>;
}

async function getDriverByPhone(phone: string): Promise<Driver> {
  const res = await fetch(`${BASE_URL}/drivers/phone/${encodeURIComponent(phone)}`, { credentials: 'include' });
  if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new ApiError(res.status, b.error ?? 'Xatolik'); }
  return res.json() as Promise<Driver>;
}

type Tab = 'car' | 'phone';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  let result = '';
  if (digits.length > 0) result += digits.slice(0, 2);
  if (digits.length > 2) result += ' ' + digits.slice(2, 5);
  if (digits.length > 5) result += ' ' + digits.slice(5, 7);
  if (digits.length > 7) result += ' ' + digits.slice(7, 9);
  return result;
}

export default function CarNumberSearch() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('car');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Car plate fields
  const [region, setRegion] = useState('');
  const [letter1, setLetter1] = useState('');
  const [digits, setDigits] = useState('');
  const [letter2, setLetter2] = useState('');
  const carNumber = (region + letter1 + digits + letter2).toUpperCase();

  // Phone field
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const phoneE164 = '+998' + phoneDisplay.replace(/\D/g, '');
  const phoneComplete = phoneDisplay.replace(/\D/g, '').length === 9;

  const refLetter1 = useRef<HTMLInputElement>(null);
  const refDigits = useRef<HTMLInputElement>(null);
  const refLetter2 = useRef<HTMLInputElement>(null);

  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!sessionStorage.getItem('customerPhone')) {
      navigate('/customer/login', { replace: true });
    }
  }, [navigate]);

  const clearError = () => setError('');

  // Plate handlers
  const handleRegion = (v: string) => {
    const val = v.replace(/\D/g, '').slice(0, 2);
    setRegion(val); clearError();
    if (val.length === 2) refLetter1.current?.focus();
  };
  const handleLetter1 = (v: string) => {
    const val = v.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
    setLetter1(val); clearError();
    if (val.length === 1) refDigits.current?.focus();
  };
  const handleDigits = (v: string) => {
    const val = v.replace(/\D/g, '').slice(0, 3);
    setDigits(val); clearError();
    if (val.length === 3) refLetter2.current?.focus();
  };
  const handleLetter2 = (v: string) => {
    const val = v.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    setLetter2(val); clearError();
  };

  const handlePhoneChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPhoneDisplay(formatPhone(e.target.value));
    clearError();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      let driver;
      if (tab === 'car') {
        if (carNumber.length < 7) { setError("Avtomobil raqamini to'liq kiriting"); setLoading(false); return; }
        driver = await getDriverByCarNumber(carNumber);
      } else {
        if (!phoneComplete) { setError("Telefon raqamini to'liq kiriting"); setLoading(false); return; }
        driver = await getDriverByPhone(phoneE164);
      }
      navigate(`/rate/${encodeURIComponent(driver.qrCode)}?phone=bypass`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) setError(tab === 'car' ? 'Bu raqamli avtomobil topilmadi' : 'Bu telefon raqamli haydovchi topilmadi');
        else if (err.status === 403) setError('Bu haydovchi hozirda baholanmaydi');
        else setError("Xatolik yuz berdi. Qayta urinib ko'ring");
      } else {
        setError("Xatolik yuz berdi. Qayta urinib ko'ring");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'bg-transparent text-center font-bold text-white focus:outline-none uppercase tracking-widest disabled:opacity-40 placeholder-white/30';

  const canSearch = tab === 'car' ? carNumber.length >= 7 : phoneComplete;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zM13 8h4l3 3v5h-7V8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Avtomobil raqamini kiriting</h1>
        </div>

        {/* Tabs */}
        <div className="flex w-full bg-gray-900 rounded-xl p-1 gap-1">
          <button
            onClick={() => { setTab('car'); clearError(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'car' ? 'bg-yellow-400 text-black' : 'text-white/50 hover:text-white'}`}
          >
            Avtomobil raqami
          </button>
          <button
            onClick={() => { setTab('phone'); clearError(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'phone' ? 'bg-yellow-400 text-black' : 'text-white/50 hover:text-white'}`}
          >
            Telefon raqami
          </button>
        </div>

        {/* Car plate input */}
        {tab === 'car' && (
          <div
            className="flex items-center bg-gray-900 rounded-2xl overflow-hidden w-full"
            style={{ border: '2.5px solid #374151', height: 80 }}
          >
            <div className="ml-3 w-2 h-2 rounded-full bg-gray-600 shrink-0" />
            <div className="flex items-center justify-center px-2" style={{ minWidth: 56 }}>
              <input type="text" inputMode="numeric" placeholder="95" value={region}
                onChange={(e) => handleRegion(e.target.value)} disabled={loading}
                className={`${inputBase} text-2xl w-10`} autoFocus />
            </div>
            <div className="w-px self-stretch bg-gray-700 mx-1" />
            <div className="flex items-center gap-1 px-2 flex-1 justify-center">
              <input ref={refLetter1} type="text" placeholder="A" value={letter1}
                onChange={(e) => handleLetter1(e.target.value)} disabled={loading}
                className={`${inputBase} text-2xl w-7`} />
              <input ref={refDigits} type="text" inputMode="numeric" placeholder="123" value={digits}
                onChange={(e) => handleDigits(e.target.value)} disabled={loading}
                className={`${inputBase} text-2xl w-14`} />
              <input ref={refLetter2} type="text" placeholder="EA" value={letter2}
                onChange={(e) => handleLetter2(e.target.value)} disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
                className={`${inputBase} text-2xl w-10`} />
            </div>
            <div className="flex flex-col items-center justify-center pr-4 gap-0.5 shrink-0">
              <div className="flex flex-col rounded overflow-hidden" style={{ width: 26, height: 17 }}>
                <div style={{ flex: 1, background: '#1EB6D4' }} />
                <div style={{ flex: '0 0 2px', background: '#fff' }} />
                <div style={{ flex: 1, background: '#fff' }} />
                <div style={{ flex: '0 0 2px', background: '#fff' }} />
                <div style={{ flex: 1, background: '#3BB54A' }} />
              </div>
              <span className="text-xs font-bold text-yellow-400 tracking-wider">UZ</span>
            </div>
            <div className="mr-3 w-2 h-2 rounded-full bg-gray-600 shrink-0" />
          </div>
        )}

        {/* Phone input */}
        {tab === 'phone' && (
          <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl focus-within:border-yellow-400 overflow-hidden w-full">
            <span className="pl-4 pr-2 text-white text-lg tracking-wider select-none shrink-0">+998</span>
            <div className="w-px self-stretch bg-gray-700 my-2" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="XX XXX XX XX"
              value={phoneDisplay}
              onChange={handlePhoneChange}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-3 text-white placeholder-white/30 focus:outline-none text-lg tracking-wider"
              autoFocus
            />
          </div>
        )}

        {/* Hint for phone tab */}
        {tab === 'phone' && (
          <p className="text-white/40 text-xs text-center -mt-2">
            Avtomobil raqami ko'rinmasa, haydovchining telefon raqamini kiriting
          </p>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={() => void handleSearch()}
          disabled={loading || !canSearch}
          className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
          Qidirish
        </button>
      </div>
    </div>
  );
}
