import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverStats, getDriverRatings, logout, ApiError } from '../services/api';
import type { DriverStats, DriverRatingView } from '../types';

const UZ_MONTHS: Record<string, string> = {
  '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
  '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
  '09': 'Sentabr', '10': 'Oktabr', '11': 'Noyabr', '12': 'Dekabr',
};

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

function formatMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  return `${UZ_MONTHS[month] ?? month} ${year}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
      ))}
    </div>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [ratings, setRatings] = useState<DriverRatingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [s, r] = await Promise.all([getDriverStats(), getDriverRatings()]);
        if (!cancelled) { setStats(s); setRatings(r); }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/driver/login', { replace: true });
        } else {
          setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/driver/login', { replace: true });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <span className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => navigate('/driver/login', { replace: true })}
          className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-xl"
        >
          Qayta kirish
        </button>
      </div>
    );
  }

  const trend = stats?.trend30Days ?? 0;
  const trendStr = trend >= 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1);
  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-white/60';

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-gray-900 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="font-semibold truncate">Mening Panelim</span>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="shrink-0 text-sm text-white/50 hover:text-white/80 transition-colors min-h-[44px] px-2"
        >
          Chiqish
        </button>
      </div>

      <div className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Stats card */}
        {stats && (
          <div className="bg-gray-900 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4 gap-2">
              <span className="text-white/60 text-sm">Umumiy statistika</span>
              <span className={`text-sm font-semibold shrink-0 ${trendColor}`}>{trendStr} (30 kun)</span>
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-5xl font-bold text-yellow-400">{stats.averageRating.toFixed(1)}</span>
              <span className="text-3xl text-yellow-400 mb-1">★</span>
            </div>
            <p className="text-white/50 text-sm">{stats.totalRatings} ta baholash</p>
          </div>
        )}

        {/* Category averages */}
        {stats && (
          <div className="bg-gray-900 rounded-2xl p-5">
            <p className="text-white/60 text-sm mb-4">Kategoriyalar bo'yicha</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORY_KEYS.map((key) => (
                <div key={key} className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-white/50 text-xs mb-1">{CATEGORY_LABELS[key]}</p>
                  <p className="text-white font-semibold text-lg">
                    {stats.categoryAverages[key].toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ratings list */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-white/60 text-sm mb-4">So'nggi baholashlar</p>
          {ratings.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">Hali baholashlar yo'q</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ratings.map((r) => (
                <div key={r.id} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Stars rating={r.overallRating} />
                    <span className="text-white/40 text-xs">{formatMonthYear(r.monthYear)}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
