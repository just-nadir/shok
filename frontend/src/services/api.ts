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
  return request<{ drivers: Driver[] }>('/admin/drivers').then((r) => r.drivers);
}

export function getAdminDriverRatings(driverId: string): Promise<DriverRatingView[]> {
  return request<DriverRatingView[]>(`/admin/drivers/${encodeURIComponent(driverId)}/ratings`);
}

export function getAdminRatings(from?: string, to?: string): Promise<DriverRatingView[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return request<{ ratings: DriverRatingView[] }>(`/admin/ratings${query ? `?${query}` : ''}`).then((r) => r.ratings);
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

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/upload/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'Yuklash xatosi');
  }
  const data = await res.json() as { url: string };
  // proxy orqali ishlaydi, to'g'ridan-to'g'ri relative URL
  return data.url;
}

export function deleteDriver(driverId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/drivers/${encodeURIComponent(driverId)}`, {
    method: 'DELETE',
  });
}

export function blockDriver(driverId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/drivers/${encodeURIComponent(driverId)}/block`, {
    method: 'POST',
  });
}

export function createDriver(data: {
  fullName: string; carNumber: string; carModel?: string; carColor?: string; avatarUrl?: string; phone?: string; password: string;
}): Promise<{ id: string; qrCode: string }> {
  return request<{ id: string; qrCode: string }>('/admin/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateDriver(driverId: string, data: {
  fullName?: string; carNumber?: string; carModel?: string; carColor?: string; avatarUrl?: string; phone?: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/drivers/${encodeURIComponent(driverId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getDriverQr(driverId: string): Promise<{ qrCode: string; qrImageUrl: string }> {
  return request<{ qrCode: string; qrImageUrl: string }>(
    `/admin/qr/${encodeURIComponent(driverId)}`
  );
}

// --- Complaints ---
import type { Complaint, DeletedComplaint } from '../types';

export function getComplaints(status?: string, from?: string, to?: string): Promise<Complaint[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return request<{ complaints: Complaint[] }>(`/complaints${q ? `?${q}` : ''}`).then(r => r.complaints);
}

export function updateComplaintStatus(id: string, status: string, resolution?: string, resolutionNote?: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/complaints/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution, resolutionNote }),
  });
}

export function deleteComplaint(id: string, reason: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/complaints/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export function getDeletedComplaints(): Promise<DeletedComplaint[]> {
  return request<{ complaints: DeletedComplaint[] }>('/complaints/deleted').then(r => r.complaints);
}
