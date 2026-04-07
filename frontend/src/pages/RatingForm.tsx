import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';
import CategoryRating from '../components/CategoryRating';
import { getDriverByQrCode, submitRating, ApiError } from '../services/api';
import { saveOfflineRating, triggerBackgroundSync } from '../services/offlineQueue';
import type { Driver, RatingRequest } from '../types';

type CategoryValue = 'good' | 'average' | 'bad';

export default function RatingForm() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const phone = searchParams.get('phone') ?? '';

  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverError, setDriverError] = useState('');
  const [loadingDriver, setLoadingDriver] = useState(true);

  const [overallRating, setOverallRating] = useState(0);
  const [cleanliness, setCleanliness] = useState<CategoryValue | undefined>();
  const [politeness, setPoliteness] = useState<CategoryValue | undefined>();
  const [drivingStyle, setDrivingStyle] = useState<CategoryValue | undefined>();
  const [punctuality, setPunctuality] = useState<CategoryValue | undefined>();
  const [comment, setComment] = useState('');

  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  // Redirect if no phone
  useEffect(() => {
    if (!phone && qrCode) {
      navigate(`/otp?qr=${encodeURIComponent(qrCode)}`, { replace: true });
    }
  }, [phone, qrCode, navigate]);

  // Fetch driver info
  useEffect(() => {
    if (!qrCode) return;
    setLoadingDriver(true);
    getDriverByQrCode(qrCode)
      .then((d) => {
        if (d.isBlocked) {
          setDriverError('Bu haydovchi hozirda baholanmaydi');
        } else {
          setDriver(d);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          if (err.status === 403) {
            setDriverError('Bu haydovchi hozirda baholanmaydi');
          } else {
            setDriverError('QR kod yaroqsiz yoki topilmadi');
          }
        } else {
          setDriverError('QR kod yaroqsiz yoki topilmadi');
        }
      })
      .finally(() => setLoadingDriver(false));
  }, [qrCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setSubmitError('');

    if (!overallRating) {
      setFieldError('Umumiy bahoni tanlang');
      return;
    }

    if (!qrCode || !phone) return;

    const data: RatingRequest = {
      driverQrCode: qrCode,
      phone,
      overallRating: overallRating as 1 | 2 | 3 | 4 | 5,
      ...(cleanliness && { cleanliness }),
      ...(politeness && { politeness }),
      ...(drivingStyle && { drivingStyle }),
      ...(punctuality && { punctuality }),
      ...(comment.trim() && { comment: comment.trim() }),
    };

    setSubmitting(true);
    try {
      await submitRating(data);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setSubmitError('Siz bu haydovchini bugun allaqachon baholagansiz');
      } else if (!navigator.onLine || (err instanceof TypeError && (err as TypeError).message === 'Failed to fetch')) {
        // Offline: save to IndexedDB and show offline confirmation
        try {
          await saveOfflineRating(data);
          await triggerBackgroundSync();
          setOfflineSaved(true);
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
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Haydovchini baholash</h1>
        </div>

        {loadingDriver && (
          <div className="flex justify-center py-8">
            <span className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingDriver && driverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center">
            {driverError}
          </div>
        )}

        {!loadingDriver && driver && !success && !offlineSaved && (
          <>
            {/* Driver info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-4">
              {driver.avatarUrl ? (
                <img src={driver.avatarUrl} alt={driver.fullName}
                  className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-yellow-300" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-yellow-300 flex items-center justify-center shrink-0 text-yellow-900 font-bold text-2xl">
                  {driver.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-base">{driver.fullName}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-sm text-gray-500 font-mono">{driver.carNumber}</span>
                  {driver.carModel && (
                    <span className="text-sm text-gray-400">{driver.carModel}</span>
                  )}
                  {driver.carColor && (
                    <span className="text-sm text-gray-400">{driver.carColor}</span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
              {/* Overall rating */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Umumiy baho <span className="text-red-500">*</span></label>
                <StarRating value={overallRating} onChange={setOverallRating} disabled={submitting} />
                {fieldError && (
                  <p className="text-red-500 text-xs">{fieldError}</p>
                )}
              </div>

              {/* Category ratings */}
              <CategoryRating label="Tozalik" value={cleanliness} onChange={setCleanliness} disabled={submitting} />
              <CategoryRating label="Xushmuomalalik" value={politeness} onChange={setPoliteness} disabled={submitting} />
              <CategoryRating label="Haydash Uslubi" value={drivingStyle} onChange={setDrivingStyle} disabled={submitting} />
              <CategoryRating label="Vaqtida Kelish" value={punctuality} onChange={setPunctuality} disabled={submitting} />

              {/* Comment */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Izoh (ixtiyoriy)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  disabled={submitting}
                  rows={3}
                  placeholder="Fikr-mulohazangizni yozing..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:border-yellow-400 disabled:opacity-60"
                />
                <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
              </div>

              {submitError && (
                <p className="text-red-500 text-sm text-center">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                Baholash
              </button>
            </form>
          </>
        )}

        {success && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center">
              <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 text-center">
              Baholingiz qabul qilindi. Rahmat!
            </p>
          </div>
        )}

        {offlineSaved && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center">
              <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-800 text-center">
              Oflayn rejim. Baholash saqlandi va keyinroq yuboriladi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
