import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getDriverByQrCode, submitRating, ApiError } from '../services/api';
import { saveOfflineRating, triggerBackgroundSync } from '../services/offlineQueue';
import type { Driver, RatingRequest } from '../types';

const COMPLAINT_REASONS = [
  { id: 'rudeness',      label: 'Haydovchi xushmuomala emas' },
  { id: 'speeding',      label: 'Tez haydash / xavfli haydash' },
  { id: 'dirty',         label: 'Avtomobil iflos' },
  { id: 'late',          label: 'Kech keldi' },
  { id: 'overcharge',    label: 'Ortiqcha pul oldi' },
  { id: 'route',         label: 'Noto\'g\'ri yo\'nalish' },
  { id: 'other',         label: 'Boshqa sabab' },
];

export default function RatingForm() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get('phone') ?? '';

  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverError, setDriverError] = useState('');
  const [loadingDriver, setLoadingDriver] = useState(true);

  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!phone && qrCode) {
      navigate(`/otp?qr=${encodeURIComponent(qrCode)}`, { replace: true });
    }
  }, [phone, qrCode, navigate]);

  useEffect(() => {
    if (!qrCode) return;
    setLoadingDriver(true);
    getDriverByQrCode(qrCode)
      .then((d) => {
        if (d.isBlocked) setDriverError('Bu haydovchi hozirda baholanmaydi');
        else setDriver(d);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setDriverError('Bu haydovchi hozirda baholanmaydi');
        else setDriverError('Haydovchi topilmadi');
      })
      .finally(() => setLoadingDriver(false));
  }, [qrCode]);

  const toggleReason = (id: string) => {
    setReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
    setFieldError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setSubmitError('');

    if (reasons.length === 0) {
      setFieldError('Kamida bitta sabab tanlang');
      return;
    }
    if (!qrCode || !phone) return;

    // Shikoyatni comment ga qo'shib yuboramiz
    const fullComment = `[Shikoyat: ${reasons.join(', ')}] ${comment.trim()}`;

    const data: RatingRequest = {
      driverQrCode: qrCode,
      phone,
      overallRating: 1,
      comment: fullComment.slice(0, 500),
    };

    setSubmitting(true);
    try {
      await submitRating(data);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setSubmitError('Siz bu haydovchi haqida bugun allaqachon shikoyat qilgansiz');
      } else if (!navigator.onLine || (err instanceof TypeError && err.message === 'Failed to fetch')) {
        try {
          await saveOfflineRating(data);
          await triggerBackgroundSync();
          setSuccess(true);
        } catch {
          setSubmitError("Xatolik yuz berdi. Keyinroq urinib ko'ring");
        }
      } else {
        setSubmitError("Xatolik yuz berdi. Keyinroq urinib ko'ring");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-3 sm:py-8 sm:px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-4 sm:p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Shikoyat qilish</h1>
        </div>

        {loadingDriver && (
          <div className="flex justify-center py-8">
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-gray-900">{driver.fullName}</p>
              <p className="text-sm text-gray-500 mt-0.5">{driver.carNumber}</p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">

              {/* Reasons */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Shikoyat sababi <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {COMPLAINT_REASONS.map((r) => {
                    const selected = reasons.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleReason(r.id)}
                        disabled={submitting}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors disabled:opacity-50 ${
                          selected
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Izoh (ixtiyoriy)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => { setComment(e.target.value.slice(0, 500)); setFieldError(''); }}
                  disabled={submitting}
                  rows={4}
                  placeholder="Nima bo'lganini batafsil yozing..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-red-400 disabled:opacity-60"
                />
                <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
              </div>

              {fieldError && <p className="text-red-500 text-sm text-center">{fieldError}</p>}
              {submitError && <p className="text-red-500 text-sm text-center">{submitError}</p>}

              <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Shikoyatingiz maxfiy saqlanadi. Shaxsiy ma'lumotlaringiz uchinchi shaxslarga berilmaydi va faqat ichki tekshiruv uchun ishlatiladi.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Shikoyat yuborish
              </button>
            </form>
          </>
        )}

        {success && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 text-center">
              Rahmat! Shikoyatingiz qabul qilindi.
            </p>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              Sizning fikringiz bizning rivojimiz uchun muhim. Tez orada ko'rib chiqamiz va kerakli choralar ko'ramiz.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
