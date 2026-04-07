import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeletedComplaints, logout, ApiError } from '../services/api';
import type { DeletedComplaint } from '../types';

export default function DeletedComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<DeletedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDeletedComplaints()
      .then(data => { if (!cancelled) setComplaints(data); })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) navigate('/admin/login', { replace: true });
        else setError(err instanceof ApiError ? err.message : 'Xatolik');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
          <div className="w-9 h-9 shrink-0 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-white">Admin Paneli</span>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          <button onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-gray-800 transition-colors text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Haydovchilar
          </button>
          <button onClick={() => navigate('/admin/complaints')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-gray-800 transition-colors text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Shikoyatlar
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-yellow-400/10 text-yellow-400">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Arxiv
          </div>
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button onClick={() => void handleLogout()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-gray-800 transition-colors justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h1 className="text-lg font-semibold">O'chirilgan shikoyatlar arxivi</h1>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <div className="px-6 pt-6 pb-10 w-full">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-3">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-sm">Arxiv bo'sh</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {complaints.map(c => (
                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 opacity-80">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      {c.driverName ? (
                        <p className="font-medium text-white">
                          {c.driverName}
                          {c.carNumber && <span className="ml-2 text-white/40 font-mono text-sm">{c.carNumber}</span>}
                        </p>
                      ) : (
                        <p className="text-white/40 text-sm italic">Haydovchi ko'rsatilmagan</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {c.phone && <span>📞 {c.phone}</span>}
                        <span>Yuborilgan: {new Date(c.createdAt).toLocaleString('uz-UZ')}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full border bg-gray-700/50 text-white/40 border-gray-600">
                      O'chirilgan
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-white/60 text-sm leading-relaxed bg-gray-800/60 rounded-xl px-4 py-3 line-through decoration-white/20">
                    {c.message}
                  </p>

                  {/* Delete reason */}
                  <div className="flex items-center gap-2 text-xs text-white/40 border-t border-gray-800 pt-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v1a1 1 0 01-1 1H5z" />
                    </svg>
                    <span>Sabab: <span className="text-white/60">{c.deletedReason}</span></span>
                    <span className="ml-auto">{new Date(c.deletedAt).toLocaleString('uz-UZ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
