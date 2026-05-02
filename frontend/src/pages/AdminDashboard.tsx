import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminDrivers, getAdminRatings, exportAdminRatings,
  blockDriver, createDriver, logout, ApiError,
} from '../services/api';
import type { Driver, DriverRatingView } from '../types';

type Tab = 'drivers' | 'complaints';
type ComplaintRow = DriverRatingView & { driverName?: string; carNumber?: string; createdAt?: string };

function isComplaint(r: ComplaintRow) {
  return r.overallRating === 1 && r.comment?.startsWith('[Shikoyat:');
}
function parseComplaint(comment: string) {
  const m = comment.match(/^\[Shikoyat: (.+?)\] (.*)$/s);
  return m ? { reasons: m[1], text: m[2].trim() } : { reasons: '', text: comment };
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm transition-all";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

type NavItem = { key: Tab; label: string; icon: React.ReactNode };
const NAV: NavItem[] = [
  {
    key: 'drivers', label: 'Haydovchilar',
    icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    key: 'complaints', label: 'Shikoyatlar',
    icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', carNumber: '', phone: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchDrivers = useCallback(async () => {
    try { setDrivers(await getAdminDrivers()); }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate('/admin/login', { replace: true });
      else setError(err instanceof ApiError ? err.message : 'Xatolik');
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    getAdminDrivers()
      .then((d) => { if (!cancelled) setDrivers(d); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) navigate('/admin/login', { replace: true });
        else setError(err instanceof ApiError ? err.message : 'Xatolik');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLoadComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    try {
      const data = await getAdminRatings(fromDate || undefined, toDate || undefined);
      setComplaints(data.filter(isComplaint));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate('/admin/login', { replace: true });
    } finally { setComplaintsLoading(false); }
  }, [fromDate, toDate, navigate]);

  useEffect(() => {
    if (tab === 'complaints' && complaints.length === 0) void handleLoadComplaints();
  }, [tab]); // eslint-disable-line

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const blob = await exportAdminRatings();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'shikoyatlar.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Eksport xatosi'); }
    finally { setExportLoading(false); }
  }, []);

  const handleBlock = useCallback(async (driver: Driver) => {
    setBlockingId(driver.id);
    try { await blockDriver(driver.id, !driver.isBlocked); await fetchDrivers(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Xatolik'); }
    finally { setBlockingId(null); }
  }, [fetchDrivers]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const handleCreate = useCallback(async () => {
    if (!createForm.fullName.trim() || !createForm.carNumber.trim() || !createForm.password.trim()) {
      setCreateError('Ism, avtomobil raqami va parol majburiy'); return;
    }
    setCreateLoading(true); setCreateError('');
    try {
      await createDriver({
        fullName: createForm.fullName.trim(), carNumber: createForm.carNumber.trim(),
        phone: createForm.phone.trim() || undefined, password: createForm.password,
      });
      setShowCreate(false);
      setCreateForm({ fullName: '', carNumber: '', phone: '', password: '' });
      await fetchDrivers();
    } catch (err) { setCreateError(err instanceof ApiError ? err.message : 'Xatolik'); }
    finally { setCreateLoading(false); }
  }, [createForm, fetchDrivers]);

  const activeCount = drivers.filter((d) => !d.isBlocked).length;
  const blockedCount = drivers.filter((d) => d.isBlocked).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <span className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error && drivers.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => navigate('/admin/login', { replace: true })}
        className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm">
        Qayta kirish
      </button>
    </div>
  );

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 text-gray-800">

        {/* ── Sidebar ── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-gray-100 shadow-sm">

          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Shok Taxi</p>
              <p className="text-xs text-gray-400 leading-tight">Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
            {NAV.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full ${
                  tab === key
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                <span className={tab === key ? 'text-indigo-600' : 'text-gray-400'}>{icon}</span>
                {label}
                {key === 'complaints' && complaints.length > 0 && (
                  <span className="ml-auto text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-semibold">{complaints.length}</span>
                )}
                {key === 'drivers' && (
                  <span className={`ml-auto text-xs rounded-full px-2 py-0.5 font-semibold ${tab === 'drivers' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{drivers.length}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-0.5">
            <button onClick={() => void handleExport()} disabled={exportLoading}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all disabled:opacity-50 w-full">
              {exportLoading
                ? <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
              CSV eksport
            </button>
            <button onClick={() => void handleLogout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all w-full">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Chiqish
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900">Admin</span>
            </div>
            <div className="flex gap-1.5">
              {NAV.map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </header>

          {/* Page topbar */}
          <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {tab === 'drivers' ? 'Haydovchilar' : 'Shikoyatlar'}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {tab === 'drivers' ? `${drivers.length} ta ro'yxatda` : `${complaints.length} ta shikoyat`}
              </p>
            </div>
            {tab === 'drivers' && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Haydovchi qo'shish
              </button>
            )}
          </div>

          {/* Stats (drivers tab only) */}
          {tab === 'drivers' && (
            <div className="grid grid-cols-3 gap-4 px-6 py-5">
              {[
                { label: 'Jami', value: drivers.length, bg: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-400' },
                { label: 'Faol', value: activeCount, bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-400' },
                { label: 'Bloklangan', value: blockedCount, bg: 'bg-red-50', text: 'text-red-700', sub: 'text-red-400' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-2xl px-5 py-4`}>
                  <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                  <p className={`text-xs font-medium mt-1 ${s.sub}`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mx-6 mb-2 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex-1 overflow-auto px-6 pb-8">

            {/* ── Drivers ── */}
            {tab === 'drivers' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {drivers.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Haydovchilar yo'q</p>
                    <button onClick={() => setShowCreate(true)}
                      className="mt-1 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                      Birinchi haydovchini qo'shing
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Haydovchi</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Avtomobil</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Holat</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {drivers.map((driver) => (
                        <tr key={driver.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600">
                                {driver.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{driver.fullName}</p>
                                <p className="text-xs text-gray-400 sm:hidden font-mono mt-0.5">{driver.carNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{driver.carNumber}</span>
                          </td>
                          <td className="px-5 py-4">
                            {driver.isBlocked
                              ? <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold border border-red-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Bloklangan
                                </span>
                              : <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Faol
                                </span>}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => void handleBlock(driver)} disabled={blockingId === driver.id}
                              className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 inline-flex items-center gap-1.5 ${
                                driver.isBlocked
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                              }`}>
                              {blockingId === driver.id && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
                              {driver.isBlocked ? 'Faollashtirish' : 'Bloklash'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Complaints ── */}
            {tab === 'complaints' && (
              <div className="flex flex-col gap-5">

                {/* Filter */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Sana bo'yicha filtrlash</p>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <Field label="Dan">
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Gacha">
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
                    </Field>
                    <button onClick={() => void handleLoadComplaints()} disabled={complaintsLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 whitespace-nowrap transition-colors shadow-sm shadow-indigo-200">
                      {complaintsLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Filtrlash
                    </button>
                  </div>
                </div>

                {complaintsLoading && (
                  <div className="flex justify-center py-12">
                    <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!complaintsLoading && complaints.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Shikoyatlar topilmadi</p>
                  </div>
                )}

                {!complaintsLoading && complaints.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {complaints.map((r) => {
                      const { reasons, text } = parseComplaint(r.comment ?? '');
                      return (
                        <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{r.driverName ?? '—'}</p>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">{r.carNumber ?? '—'}</p>
                              </div>
                            </div>
                            {r.createdAt && (
                              <span className="text-xs text-gray-400 shrink-0 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                {formatDate(r.createdAt)}
                              </span>
                            )}
                          </div>
                          {reasons && (
                            <div className="flex flex-wrap gap-2">
                              {reasons.split(', ').map((reason) => (
                                <span key={reason} className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 font-medium">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                          {text && (
                            <div className="bg-gray-50 rounded-xl px-4 py-3 border-l-2 border-gray-200">
                              <p className="text-sm text-gray-600 italic leading-relaxed">"{text}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateError(''); } }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Yangi haydovchi</h2>
                <p className="text-xs text-gray-400 mt-0.5">Barcha majburiy maydonlarni to'ldiring</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <Field label="Ism Familiya *">
                <input type="text" placeholder="Ali Valiyev" value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  className={inputCls} autoFocus />
              </Field>
              <Field label="Avtomobil raqami *">
                <input type="text" placeholder="01A123BC" value={createForm.carNumber}
                  onChange={(e) => setCreateForm((f) => ({ ...f, carNumber: e.target.value.toUpperCase() }))}
                  className={`${inputCls} uppercase tracking-widest font-mono`} />
              </Field>
              <Field label="Telefon raqami (ixtiyoriy)">
                <input type="tel" placeholder="+998 90 123 45 67" value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls} />
              </Field>
              <Field label="Parol *">
                <input type="password" placeholder="Kamida 6 ta belgi" value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                  className={inputCls} />
              </Field>
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  {createError}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm transition-colors">
                Bekor qilish
              </button>
              <button onClick={() => void handleCreate()} disabled={createLoading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-200">
                {createLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Yaratish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
