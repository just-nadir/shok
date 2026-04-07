import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverMe, getDriverComplaints, logout, ApiError } from '../services/api';
import type { Driver } from '../types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:      { label: 'Yangi',       className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  reviewed: { label: "Ko'rildi",    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  resolved: { label: 'Hal qilindi', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const UZ_MONTHS: Record<string, string> = {
  '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel',
  '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust',
  '09': 'Sentabr', '10': 'Oktabr', '11': 'Noyabr', '12': 'Dekabr',
};

function formatMonth(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${UZ_MONTHS[month] ?? month} ${year}`;
}

type Complaint = { id: string; message: string; status: string; resolution: string | null; monthYear: string };

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDriverMe(), getDriverComplaints()])
      .then(([me, data]) => { if (!cancelled) { setDriver(me); setComplaints(data); } })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) navigate('/driver/login', { replace: true });
        else setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/driver/login', { replace: true });
  }, [navigate]);

  const newCount = complaints.filter(c => c.status === 'new').length;

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
        <button onClick={() => navigate('/driver/login', { replace: true })}
          className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-xl">
          Qayta kirish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          {driver?.avatarUrl ? (
            <img src={driver.avatarUrl} alt={driver.fullName}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 text-black font-bold text-lg">
              {driver?.fullName.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{driver?.fullName ?? 'Mening Panelim'}</p>
            <p className="text-xs text-white/50 truncate">
              {driver?.carNumber}
              {driver?.carModel && <span className="ml-1.5">{driver.carModel}</span>}
              {driver?.carColor && <span className="ml-1.5 text-white/30">{driver.carColor}</span>}
            </p>
          </div>
        </div>
        <button onClick={() => void handleLogout()}
          className="text-sm text-white/50 hover:text-white/80 transition-colors px-2 py-2 shrink-0">
          Chiqish
        </button>
      </div>

      <div className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-white/50 text-xs">Jami</p>
            <p className="text-2xl font-bold text-white">{complaints.length}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-white/50 text-xs">Yangi</p>
            <p className={`text-2xl font-bold ${newCount > 0 ? 'text-blue-400' : 'text-white'}`}>{newCount}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-white/50 text-xs">Hal qilindi</p>
            <p className="text-2xl font-bold text-green-400">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Complaints list */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-white/60 text-sm mb-4">Shikoyatlar</p>
          {complaints.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-white/30">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Shikoyatlar yo'q</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {complaints.map(c => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG['new'];
                return (
                  <div key={c.id} className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${cfg.className}`}>
                        {cfg.label}
                      </span>
                      <span className="text-white/40 text-xs">{formatMonth(c.monthYear)}</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">{c.message}</p>
                    {c.resolution && (
                      <p className="text-xs text-green-400 border-t border-gray-700 pt-2">
                        Hal qilish usuli: {c.resolution}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
