import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminDrivers,
  getAdminRatings,
  exportAdminRatings,
  blockDriver,
  logout,
  ApiError,
} from '../services/api';
import type { Driver, DriverRatingView } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: 'Tozalik',
  politeness: 'Xushmuomalalik',
  drivingStyle: 'Haydash Uslubi',
  punctuality: 'Vaqtida Kelish',
};

const VALUE_BADGES: Record<string, { label: string; className: string }> = {
  good: { label: 'Yaxshi', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  average: { label: "O'rtacha", className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  bad: { label: 'Yomon', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
};

const CATEGORY_KEYS = ['cleanliness', 'politeness', 'drivingStyle', 'punctuality'] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
      ))}
    </div>
  );
}

type Tab = 'drivers' | 'ratings';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ratings, setRatings] = useState<DriverRatingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await getAdminDrivers();
      setDrivers(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/admin/login', { replace: true });
      } else {
        setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
      }
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const data = await getAdminDrivers();
        if (!cancelled) setDrivers(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/admin/login', { replace: true });
        } else {
          setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleFilterRatings = useCallback(async () => {
    setRatingsLoading(true);
    try {
      const data = await getAdminRatings(fromDate || undefined, toDate || undefined);
      setRatings(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/admin/login', { replace: true });
      } else {
        setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
      }
    } finally {
      setRatingsLoading(false);
    }
  }, [fromDate, toDate, navigate]);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const blob = await exportAdminRatings();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ratings.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Eksport xatosi');
    } finally {
      setExportLoading(false);
    }
  }, []);

  const handleBlock = useCallback(async (driverId: string) => {
    setBlockingId(driverId);
    try {
      await blockDriver(driverId);
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
    } finally {
      setBlockingId(null);
    }
  }, [fetchDrivers]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <span className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => navigate('/admin/login', { replace: true })}
          className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-xl"
        >
          Qayta kirish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-gray-900 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-semibold truncate">Admin Paneli</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => void handleExport()}
            disabled={exportLoading}
            className="text-sm px-3 py-2 min-h-[44px] bg-yellow-400 text-black font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {exportLoading && (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            )}
            <span className="hidden sm:inline">CSV </span>Eksport
          </button>
          <button
            onClick={() => void handleLogout()}
            className="text-sm text-white/50 hover:text-white/80 transition-colors min-h-[44px] px-2"
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => setTab('drivers')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${tab === 'drivers' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Haydovchilar
        </button>
        <button
          onClick={() => setTab('ratings')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${tab === 'ratings' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Baholashlar
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="px-3 sm:px-4 pt-6 max-w-3xl mx-auto">
        {/* Drivers tab */}
        {tab === 'drivers' && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <p className="text-white/60 text-sm">Jami: {drivers.length} ta haydovchi</p>
            </div>
            {drivers.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">Haydovchilar yo'q</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{driver.fullName}</p>
                      <p className="text-sm text-white/50">{driver.carNumber}</p>
                      {driver.isBlocked && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 mt-1 inline-block">
                          Bloklangan
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => void handleBlock(driver.id)}
                      disabled={blockingId === driver.id || driver.isBlocked}
                      className="shrink-0 text-sm px-3 py-2 min-h-[44px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      {blockingId === driver.id && (
                        <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {driver.isBlocked ? 'Bloklangan' : 'Bloklash'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ratings tab */}
        {tab === 'ratings' && (
          <div className="flex flex-col gap-5">
            {/* Date filter */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <p className="text-white/60 text-sm mb-4">Sana oralig'i bo'yicha filtrlash</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Dan</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 min-h-[44px] text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Gacha</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 min-h-[44px] text-white text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="flex sm:items-end">
                  <button
                    onClick={() => void handleFilterRatings()}
                    disabled={ratingsLoading}
                    className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-yellow-400 text-black font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {ratingsLoading && (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                    Filtrlash
                  </button>
                </div>
              </div>
            </div>

            {/* Ratings list */}
            {ratings.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-5">
                <p className="text-white/60 text-sm mb-4">{ratings.length} ta baholash topildi</p>
                <div className="flex flex-col gap-3">
                  {ratings.map((r) => (
                    <div key={r.id} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Stars rating={r.overallRating} />
                        <span className="text-white/40 text-xs">{r.monthYear}</span>
                      </div>
                      {CATEGORY_KEYS.some((k) => r[k]) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {CATEGORY_KEYS.map((cat) => {
                            const val = r[cat];
                            if (!val) return null;
                            const badge = VALUE_BADGES[val];
                            if (!badge) return null;
                            return (
                              <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                                {CATEGORY_LABELS[cat]}: {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {r.comment && (
                        <p className="text-white/60 text-sm italic">"{r.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ratings.length === 0 && !ratingsLoading && (
              <p className="text-white/40 text-sm text-center py-4">
                Filtrlash uchun sana oralig'ini tanlang
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
