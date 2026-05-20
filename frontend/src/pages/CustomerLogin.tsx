import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TELEGRAM_CLIENT_ID = import.meta.env.VITE_TELEGRAM_CLIENT_ID || '8776345771';

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (options: { client_id: number; request_access?: string[]; lang?: string }, callback: (data: { id_token?: string; error?: string }) => void) => void;
      };
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: { id: number; first_name: string; last_name?: string; username?: string };
        };
        ready: () => void;
        close: () => void;
        platform: string;
      };
    };
  }
}

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mini App ichida bo'lsa — avtomatik auth
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      setLoading(true);
      fetch('/api/auth/telegram-webapp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error || 'Kirish xatosi');
          }
          navigate('/customer/search', { replace: true });
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Xatolik');
          setLoading(false);
        });
      return;
    }

    // Brauzer uchun Telegram Login SDK yuklash
    if (document.getElementById('telegram-login-sdk')) return;
    const script = document.createElement('script');
    script.id = 'telegram-login-sdk';
    script.src = 'https://telegram.org/js/telegram-login.js';
    script.async = true;
    document.head.appendChild(script);
  }, [navigate]);

  const handleTelegramAuth = useCallback(async (data: { id_token?: string; error?: string }) => {
    if (data.error || !data.id_token) {
      setError(data.error || 'Telegram orqali kirishda xato');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: data.id_token }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Kirish xatosi');
      }

      navigate('/customer/search', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogin = useCallback(() => {
    setError('');
    if (!window.Telegram?.Login) {
      setError('Telegram SDK yuklanmadi. Sahifani yangilang.');
      return;
    }

    window.Telegram.Login.auth(
      {
        client_id: Number(TELEGRAM_CLIENT_ID),
        request_access: ['phone'],
        lang: 'uz',
      },
      handleTelegramAuth
    );
  }, [handleTelegramAuth]);

  // Mini App ichida loading ko'rsatish
  if (window.Telegram?.WebApp?.initData && loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h8zM13 8h4l3 3v5h-7V8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Shok Taxi</h1>
          <p className="text-white/50 text-sm text-center">Haydovchini baholash uchun Telegram orqali kiring</p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold rounded-xl text-base transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          )}
          Telegram orqali kirish
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <p className="text-white/30 text-xs text-center">
          Telegram akkauntingiz orqali xavfsiz kirish. Telefon raqamingiz maxfiy saqlanadi.
        </p>
      </div>
    </div>
  );
}
