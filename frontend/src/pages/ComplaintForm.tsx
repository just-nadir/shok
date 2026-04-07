import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getDriver, ApiError } from '../services/api';
import type { Driver } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const REASONS = [
  'Haydovchi xushmuomala emas',
  'Tez haydash / xavfli haydash',
  'Avtomobil iflos',
  'Kech keldi',
  'Ortiqcha pul oldi',
  "Noto'g'ri yo'nalish",
  'Boshqa sabab',
];

export default function ComplaintForm() {
  const { driverId } = useParams<{ driverId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get('phone') ?? '';

  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverError, setDriverError] = useState('');
  const [loadingDriver, setLoadingDriver] = useState(true);

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!phone && driverId) {
      navigate(`/otp?dr=${encodeURIComponent(driverId)}`, { replace: true });
    }
  }, [phone, driverId, navigate]);

  useEffect(() => {
    if (!driverId) return;
    setLoadingDriver(true);
    getDriver(driverId)
      .then(d => {
        if (d.isBlocked) setDriverError('Bu haydovchi hozirda baholanmaydi');
        else setDriver(d);
      })
      .catch(err => {
        setDriverError(
          err instanceof ApiError && err.status === 403
            ? 'Bu haydovchi hozirda baholanmaydi'
            : 'Haydovchi topilmadi'
        );
      })
      .finally(() => setLoadingDriver(false));
  }, [driverId]);

  const toggleReason = useCallback((reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
    setFieldError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedReasons.length === 0) {
      setFieldError('Kamida bitta sabab tanlang');
      return;
    }
    if (!message.trim()) {
      setFieldError('Izoh yozing');
      return;
    }
    if (!driverId) return;

    setSubmitting(true);
    setFieldError('');
    try {
      const res = await fetch(`${BASE_URL}/complaints`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          phone: phone || undefined,
          message: `${selectedReasons.join(', ')}. ${message.trim()}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Xatolik');
      }
      setSuccess(true);
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }, [selectedReasons, message, driverId, phone]);

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Shikoyat qilish</h1>
        </div>

        {loadingDriver && (
          <div className="flex justify-center py-6">
            <span className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingDriver && driverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center">
            {driverError}
          </div>
        )}

        {!loadingDriver && driver && !success && (
          <>
            {/* Driver info */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
              {driver.avatarUrl ? (
                <img src={driver.avatarUrl} alt={driver.fullName}
                  className="w-11 h-11 rounded-full object-cover shrink-0 border border-red-200" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-red-200 flex items-center justify-center shrink-0 text-red-700 font-bold text-lg">
                  {driver.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{driver.fullName}</p>
                <p className="text-sm text-gray-500">
                  {driver.carNumber}
                  {driver.carModel && <span className="ml-2">{driver.carModel}</span>}
                </p>
              </div>
            </div>

            {/* Reasons */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-800">
                Shikoyat sababi <span className="text-red-500">*</span>
              </label>
              {REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => toggleReason(reason)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                    selectedReasons.includes(reason)
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedReasons.includes(reason) ? 'border-red-400 bg-red-400' : 'border-gray-300'
                  }`}>
                    {selectedReasons.includes(reason) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {reason}
                </button>
              ))}
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-800">
                Izoh <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value.slice(0, 500)); setFieldError(''); }}
                rows={4}
                placeholder="Nima bo'lganini batafsil yozing..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-red-400"
              />
              <p className="text-xs text-gray-400 text-right">{message.length}/500</p>
            </div>

            {fieldError && <p className="text-red-500 text-sm text-center">{fieldError}</p>}

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Shikoyat yuborish
            </button>
          </>
        )}

        {success && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 text-center">
              Shikoyatingiz qabul qilindi. Rahmat!
            </p>
            <p className="text-sm text-gray-500 text-center">
              Tez orada ko'rib chiqiladi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
