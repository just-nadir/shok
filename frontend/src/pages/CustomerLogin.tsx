import { useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  let result = '';
  if (digits.length > 0) result += digits.slice(0, 2);
  if (digits.length > 2) result += ' ' + digits.slice(2, 5);
  if (digits.length > 5) result += ' ' + digits.slice(5, 7);
  if (digits.length > 7) result += ' ' + digits.slice(7, 9);
  return result;
}

function isPhoneComplete(formatted: string): boolean {
  return formatted.replace(/\D/g, '').length === 9;
}

function toE164(formatted: string): string {
  return '+998' + formatted.replace(/\D/g, '');
}

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phoneDisplay, setPhoneDisplay] = useState('');

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPhoneDisplay(formatPhone(e.target.value));
  }, []);

  const handleSubmit = () => {
    if (!isPhoneComplete(phoneDisplay)) return;
    sessionStorage.setItem('customerPhone', toE164(phoneDisplay));
    navigate('/customer/search', { replace: true });
  };

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
          <h1 className="text-xl font-bold text-white">Shok Taxi</h1>
          <p className="text-sm text-white/60 mt-1">Telefon raqamingizni kiriting</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Telefon raqam</label>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl focus-within:border-yellow-400 overflow-hidden">
              <span className="pl-4 pr-2 text-white text-lg tracking-wider select-none shrink-0">+998</span>
              <div className="w-px self-stretch bg-gray-700 my-2" />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="XX XXX XX XX"
                value={phoneDisplay}
                onChange={handleChange}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                className="flex-1 bg-transparent px-3 py-3 text-white placeholder-white/30 focus:outline-none text-lg tracking-wider"
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isPhoneComplete(phoneDisplay)}
            className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            Davom etish
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs text-white/40 text-center">
              Barcha ma'lumotlaringiz sir saqlanadi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
