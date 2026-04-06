import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, ApiError } from '../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setError("Login va parolni kiriting");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminLogin(username.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setError("Login yoki parol noto'g'ri");
        } else if (err.status === 423 || err.status === 429) {
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
  }, [username, password, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Admin Paneli</h1>
          <p className="text-sm text-white/60 mt-1">Admin hisobiga kiring</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Login</label>
            <input
              type="text"
              placeholder="Loginni kiriting"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Parol</label>
            <input
              type="password"
              placeholder="Parolni kiriting"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            )}
            Kirish
          </button>
        </div>
      </div>
    </div>
  );
}
