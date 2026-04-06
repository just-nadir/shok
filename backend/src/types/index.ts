// Kategoriya qiymati
export type CategoryValue = 'good' | 'average' | 'bad';

// API xato javobi
export interface ApiError {
  error: string;
  code: string;
}

// Sessiya foydalanuvchisi
export interface SessionUser {
  id: string;
  role: 'driver' | 'admin';
}

// Express session kengaytmasi
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    otpPhone?: string;
    // Auth route session fields
    userId?: string;
    role?: 'customer' | 'driver' | 'admin';
    phone?: string | null;
  }
}
