import type { Driver, RatingRequest, DriverStats, DriverRatingView } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isGet = !options.method || options.method === 'GET';

  const headers: HeadersInit = {
    ...(isGet ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  // For void responses (e.g. 204 No Content)
  const contentType = res.headers.get('content-type') ?? '';
  if (res.status === 204 || !contentType.includes('application/json')) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// --- Public endpoints ---

export function getDriverByQrCode(qrCode: string): Promise<Driver> {
  return request<Driver>(`/driver/${encodeURIComponent(qrCode)}`);
}

export function submitRating(data: RatingRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/ratings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function sendOtp(phone: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, code: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export function driverLogin(username: string, password: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/driver/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function adminLogin(username: string, password: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' });
}

export interface AuthSession {
  role: 'driver' | 'admin' | 'customer';
  userId: string;
}

export function getAuthMe(): Promise<AuthSession> {
  return request<AuthSession>('/auth/me');
}

// --- Driver (authenticated) endpoints ---

export function getDriverStats(): Promise<DriverStats> {
  return request<DriverStats>('/driver/me/stats');
}

export function getDriverRatings(): Promise<DriverRatingView[]> {
  return request<DriverRatingView[]>('/driver/me/ratings');
}

// --- Admin endpoints ---

export function getAdminDrivers(): Promise<Driver[]> {
  return request<Driver[]>('/admin/drivers');
}

export function getAdminDriverRatings(driverId: string): Promise<DriverRatingView[]> {
  return request<DriverRatingView[]>(`/admin/drivers/${encodeURIComponent(driverId)}/ratings`);
}

export function getAdminRatings(from?: string, to?: string): Promise<DriverRatingView[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return request<DriverRatingView[]>(`/admin/ratings${query ? `?${query}` : ''}`);
}

export async function exportAdminRatings(): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/admin/ratings/export`, {
    credentials: 'include',
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return res.blob();
}

export function blockDriver(driverId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/drivers/${encodeURIComponent(driverId)}/block`, {
    method: 'POST',
  });
}

export function getDriverQr(driverId: string): Promise<{ qrCode: string; qrImageUrl: string }> {
  return request<{ qrCode: string; qrImageUrl: string }>(
    `/admin/qr/${encodeURIComponent(driverId)}`
  );
}
