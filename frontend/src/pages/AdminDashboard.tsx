import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminDrivers,
  deleteDriver,
  createDriver,
  updateDriver,
  uploadAvatar,
  logout,
  ApiError,
} from '../services/api';
import type { Driver } from '../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState({ fullName: '', carNumber: '', carModel: '', carColor: '', avatarUrl: '', phone: '', password: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = useCallback(async (driverId: string) => {
    if (!confirm("Haydovchini o'chirishni tasdiqlaysizmi?")) return;
    setDeletingId(driverId);
    try {
      await deleteDriver(driverId);
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
    } finally {
      setDeletingId(null);
    }
  }, [fetchDrivers]);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const openCreate = useCallback(() => {
    setEditDriver(null);
    setForm({ fullName: '', carNumber: '', carModel: '', carColor: '', avatarUrl: '', phone: '', password: '' });
    setFormError('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((driver: Driver) => {
    setEditDriver(driver);
    setForm({ fullName: driver.fullName, carNumber: driver.carNumber, carModel: driver.carModel ?? '', carColor: driver.carColor ?? '', avatarUrl: driver.avatarUrl ?? '', phone: driver.phone ?? '', password: '' });
    setFormError('');
    setModalOpen(true);
  }, []);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setFormError('');
    try {
      const url = await uploadAvatar(file);
      setForm(f => ({ ...f, avatarUrl: url }));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Rasm yuklashda xato');
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  const handleFormSave = useCallback(async () => {
    if (!form.fullName.trim() || !form.carNumber.trim()) {
      setFormError("Ism va avtomobil raqami kerak");
      return;
    }
    if (!editDriver && !form.password.trim()) {
      setFormError("Parol kerak");
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      if (editDriver) {
        await updateDriver(editDriver.id, {
          fullName: form.fullName.trim(),
          carNumber: form.carNumber.trim(),
          carModel: form.carModel.trim() || undefined,
          carColor: form.carColor.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
          phone: form.phone.trim() || undefined,
        });
      } else {
        await createDriver({
          fullName: form.fullName.trim(),
          carNumber: form.carNumber.trim(),
          carModel: form.carModel.trim() || undefined,
          carColor: form.carColor.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
        });
      }
      setModalOpen(false);
      await fetchDrivers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
    } finally {
      setFormLoading(false);
    }
  }, [form, editDriver, fetchDrivers]);

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
        <button onClick={() => navigate('/admin/login', { replace: true })}
          className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-xl">
          Qayta kirish
        </button>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = q
    ? drivers.filter(d =>
        d.fullName.toLowerCase().includes(q) ||
        d.carNumber.toLowerCase().includes(q) ||
        (d.carModel ?? '').toLowerCase().includes(q) ||
        (d.carColor ?? '').toLowerCase().includes(q)
      )
    : drivers;

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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-yellow-400/10 text-yellow-400">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Haydovchilar
          </div>
          <button onClick={() => navigate('/admin/complaints')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-gray-800 transition-colors text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Shikoyatlar
          </button>
          <button onClick={() => navigate('/admin/complaints/deleted')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-gray-800 transition-colors text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Arxiv
          </button>
        </nav>

        <div className="p-3 border-t border-gray-800 flex flex-col gap-2">
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-gray-800 transition-colors justify-center"
          >
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
          <h1 className="text-lg font-semibold">Haydovchilar</h1>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="px-6 pt-6 pb-10 w-full flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <p className="text-white/50 text-sm shrink-0">Jami: {drivers.length} ta</p>
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder="Ism, raqam, model yoki rang bo'yicha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-black text-sm font-semibold rounded-xl shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Qo'shish
            </button>
          </div>

          {/* Table */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Haydovchi</th>
                  <th className="text-left px-4 py-3 font-medium">Avtomobil raqami</th>
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-left px-4 py-3 font-medium">Rang</th>
                  <th className="text-left px-4 py-3 font-medium">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="text-right px-4 py-3 font-medium">Amallar</th>                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-white/30 py-12">
                      {search ? 'Natija topilmadi' : 'Haydovchilar yo\'q'}
                    </td>
                  </tr>
                ) : filtered.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {driver.avatarUrl ? (
                          <img src={driver.avatarUrl} alt={driver.fullName}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-white/60 font-bold">
                            {driver.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-white">{driver.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/80">{driver.carNumber}</td>
                    <td className="px-4 py-3 text-white/60">{driver.carModel ?? '—'}</td>
                    <td className="px-4 py-3">
                      {driver.carColor ? (
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0"
                            style={{ backgroundColor:
                              driver.carColor.toLowerCase() === 'oq' ? '#fff' :
                              driver.carColor.toLowerCase() === 'qora' ? '#111' :
                              driver.carColor.toLowerCase() === 'kumush' ? '#c0c0c0' :
                              driver.carColor.toLowerCase() === 'qizil' ? '#ef4444' :
                              driver.carColor.toLowerCase() === "ko'k" ? '#3b82f6' : '#6b7280'
                            }} />
                          <span className="text-white/60">{driver.carColor}</span>
                        </div>
                      ) : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {driver.phone
                        ? <span className="font-mono text-white/70 text-sm">{driver.phone}</span>
                        : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {driver.isBlocked
                        ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Bloklangan</span>
                        : <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Faol</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(driver)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-gray-700 transition-colors"
                          title="Tahrirlash">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => void handleDelete(driver.id)}
                          disabled={deletingId === driver.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg disabled:opacity-40 hover:bg-red-500/20 transition-colors"
                        >
                          {deletingId === driver.id
                            ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v1a1 1 0 01-1 1H5z" />
                              </svg>
                          }
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-5">
              {editDriver ? 'Haydovchini tahrirlash' : "Yangi haydovchi qo'shish"}
            </h2>
            <div className="flex flex-col gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-1">
                <div className="relative">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover border border-gray-700" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-white/40 text-2xl font-bold">
                      {form.fullName.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                    className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white/70 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
                    {avatarUploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                  </button>
                  {form.avatarUrl && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, avatarUrl: '' }))}
                      className="text-xs text-red-400 hover:text-red-300 text-left">
                      O'chirish
                    </button>
                  )}
                  <p className="text-xs text-white/30">JPEG, PNG, WebP · max 2MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={(e) => void handleAvatarChange(e)} />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Ism Familiya *</label>
                <input type="text" placeholder="Alisher Umarov" value={form.fullName}
                  onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Avtomobil raqami *</label>
                  <input type="text" placeholder="01A123BC" value={form.carNumber}
                    onChange={(e) => setForm(f => ({ ...f, carNumber: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Model</label>
                  <input type="text" placeholder="Cobalt 2022" value={form.carModel}
                    onChange={(e) => setForm(f => ({ ...f, carModel: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Avtomobil rangi</label>
                <input type="text" placeholder="Oq, Qora, Kumush..." value={form.carColor}
                  onChange={(e) => setForm(f => ({ ...f, carColor: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Telefon raqami</label>
                <input type="tel" placeholder="+998901234567" value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
              </div>

              {!editDriver && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">Parol *</label>
                  <input type="password" placeholder="Parol kiriting" value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-400" />
                </div>
              )}

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-white/60 text-sm hover:bg-gray-800 transition-colors">
                  Bekor qilish
                </button>
                <button onClick={() => void handleFormSave()} disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-black font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {formLoading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
