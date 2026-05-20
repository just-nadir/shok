import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../services/api';
import type { Driver } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

async function searchDriver(query: string): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/drivers/search?q=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'Xatolik');
  }
  const data = await res.json() as { drivers: Driver[] };
  return data.drivers;
}

export default function DriverSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') ?? '';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const data = await searchDriver(query.trim());
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSelect = (driver: Driver) => {
    navigate(`/r/${encodeURIComponent(driver.id)}?phone=${encodeURIComponent(phone)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Haydovchini toping</h1>
            <p className="text-sm text-gray-500">Avtomobil raqami yoki telefon bo'yicha</p>
          </div>
        </div>

        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="01A123BC yoki +998901234567"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"
            autoFocus
          />
          <button
            onClick={() => void handleSearch()}
            disabled={loading || !query.trim()}
            className="px-4 py-3 bg-yellow-400 text-black font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
            }
            Qidirish
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Results */}
        {searched && results.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">Haydovchi topilmadi</p>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map(driver => (
              <button
                key={driver.id}
                onClick={() => handleSelect(driver)}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-left"
              >
                {driver.avatarUrl ? (
                  <img src={driver.avatarUrl} alt={driver.fullName}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 text-yellow-700 font-bold text-lg">
                    {driver.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{driver.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {driver.carNumber}
                    {driver.carModel && <span className="ml-2">{driver.carModel}</span>}
                    {driver.carColor && <span className="ml-2 text-gray-400">{driver.carColor}</span>}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
