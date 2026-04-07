import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComplaints, updateComplaintStatus, deleteComplaint, logout, ApiError } from '../services/api';
import type { Complaint } from '../types';

const STATUS_CONFIG = {
  new:      { label: 'Yangi',       className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  reviewed: { label: "Ko'rildi",    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  resolved: { label: 'Hal qilindi', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export default function ComplaintsDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('new');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<{ id: string } | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ id: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const DELETE_REASONS = [
    'Noto\'g\'ri shikoyat',
    'Takroriy shikoyat',
    'Spam yoki bezorilik',
    'Boshqa sabab',
  ];

  const RESOLUTION_OPTIONS = [
    'Haydovchi ogohlantirildi',
    'Haydovchi bilan suhbat o\'tkazildi',
    'Haydovchiga jarima berildi',
    'Boshqa chora ko\'rildi',
  ];

  const fetchComplaints = useCallback(async (status?: string, from?: string, to?: string) => {
    try {
      const data = await getComplaints(status || undefined, from || undefined, to || undefined);
      setComplaints(data);
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
    setLoading(true);
    getComplaints(filter || undefined, fromDate || undefined, toDate || undefined)
      .then(data => { if (!cancelled) setComplaints(data); })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) navigate('/admin/login', { replace: true });
        else setError(err instanceof ApiError ? err.message : 'Xatolik');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, fromDate, toDate, navigate]);

  const handleStatus = useCallback(async (id: string, status: string) => {
    if (status === 'resolved') {
      setResolution('');
      setResolutionNote('');
      setResolveModal({ id });
      return;
    }
    setUpdatingId(id);
    try {
      await updateComplaintStatus(id, status);
      await fetchComplaints(filter || undefined, fromDate || undefined, toDate || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik');
    } finally {
      setUpdatingId(null);
    }
  }, [filter, fromDate, toDate, fetchComplaints]);

  const handleResolveConfirm = useCallback(async () => {
    if (!resolveModal) return;
    if (!resolution) { setError("Hal qilish usulini tanlang"); return; }
    setResolving(true);
    try {
      await updateComplaintStatus(resolveModal.id, 'resolved', resolution, resolutionNote || undefined);
      setResolveModal(null);
      await fetchComplaints(filter || undefined, fromDate || undefined, toDate || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik');
    } finally {
      setResolving(false);
    }
  }, [resolveModal, resolution, resolutionNote, filter, fromDate, toDate, fetchComplaints]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleteReason('');
    setDeleteModal({ id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal) return;
    if (!deleteReason) { setError("O'chirish sababini tanlang"); return; }
    setDeleting(true);
    try {
      await deleteComplaint(deleteModal.id, deleteReason);
      setDeleteModal(null);
      await fetchComplaints(filter || undefined, fromDate || undefined, toDate || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik');
    } finally {
      setDeleting(false);
    }
  }, [deleteModal, deleteReason, filter, fromDate, toDate, fetchComplaints]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const counts = complaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-yellow-400/10 text-yellow-400">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Shikoyatlar
            {(counts['new'] ?? 0) > 0 && (
              <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {counts['new']}
              </span>
            )}
          </div>
          <button onClick={() => navigate('/admin/complaints/deleted')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-gray-800 transition-colors text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Arxiv
          </button>
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold mr-2">Shikoyatlar</h1>

            {/* Status filter */}
            <div className="flex items-center gap-1 text-sm">
              {[
                { value: 'new', label: 'Yangi' },
                { value: 'reviewed', label: "Ko'rildi" },
                { value: 'resolved', label: 'Hal qilindi' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${filter === opt.value ? 'bg-yellow-400 text-black font-semibold' : 'text-white/50 hover:text-white hover:bg-gray-800'}`}>
                  {opt.label}
                  {(counts[opt.value] ?? 0) > 0 && (
                    <span className="ml-1 text-xs opacity-70">({counts[opt.value]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-white/40 shrink-0">Dan:</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-white/40 shrink-0">Gacha:</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400" />
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); }}
                  className="text-xs text-white/40 hover:text-white/70 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  Tozalash
                </button>
              )}
            </div>
          </div>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Shikoyatlar yo'q</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {complaints.map(c => (
                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
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
                        <span>{new Date(c.createdAt).toLocaleString('uz-UZ')}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${STATUS_CONFIG[c.status].className}`}>
                      {STATUS_CONFIG[c.status].label}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-white/80 text-sm leading-relaxed bg-gray-800 rounded-xl px-4 py-3">
                    {c.message}
                  </p>

                  {/* Resolution info */}
                  {c.status === 'resolved' && c.resolution && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex flex-col gap-1">
                      <p className="text-xs text-green-400 font-medium">Hal qilish usuli: {c.resolution}</p>
                      {c.resolutionNote && <p className="text-xs text-white/50">{c.resolutionNote}</p>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.status !== 'reviewed' && c.status !== 'resolved' && (
                      <button onClick={() => void handleStatus(c.id, 'reviewed')}
                        disabled={updatingId === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-40">
                        {updatingId === c.id
                          ? <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          : null}
                        Ko'rildi deb belgilash
                      </button>
                    )}
                    {c.status !== 'resolved' && (
                      <button onClick={() => void handleStatus(c.id, 'resolved')}
                        disabled={updatingId === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-40">
                        {updatingId === c.id
                          ? <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          : null}
                        Hal qilindi
                      </button>
                    )}
                    <button onClick={() => void handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40">
                      {deletingId === c.id
                        ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v1a1 1 0 01-1 1H5z" />
                          </svg>
                      }
                      O'chirish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">Qanday hal qilindi?</h2>

            <div className="flex flex-col gap-2">
              {RESOLUTION_OPTIONS.map(opt => (
                <button key={opt} onClick={() => setResolution(opt)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-colors border ${
                    resolution === opt
                      ? 'bg-green-500/15 border-green-500/40 text-green-400'
                      : 'border-gray-700 text-white/60 hover:border-gray-600 hover:text-white'
                  }`}>
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${resolution === opt ? 'border-green-400' : 'border-gray-600'}`}>
                    {resolution === opt && <span className="w-2 h-2 rounded-full bg-green-400" />}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Qo'shimcha izoh (ixtiyoriy)</label>
              <textarea
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="Batafsil yozing..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-yellow-400"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setResolveModal(null); setError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-white/60 text-sm hover:bg-gray-800 transition-colors">
                Bekor qilish
              </button>
              <button onClick={() => void handleResolveConfirm()} disabled={resolving || !resolution}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {resolving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-base font-semibold text-white">O'chirish sababi</h2>

            <div className="flex flex-col gap-2">
              {DELETE_REASONS.map(opt => (
                <button key={opt} onClick={() => setDeleteReason(opt)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-colors border ${
                    deleteReason === opt
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'border-gray-700 text-white/60 hover:border-gray-600 hover:text-white'
                  }`}>
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${deleteReason === opt ? 'border-red-400' : 'border-gray-600'}`}>
                    {deleteReason === opt && <span className="w-2 h-2 rounded-full bg-red-400" />}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setDeleteModal(null); setError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-white/60 text-sm hover:bg-gray-800 transition-colors">
                Bekor qilish
              </button>
              <button onClick={() => void handleDeleteConfirm()} disabled={deleting || !deleteReason}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {deleting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
