// Haydovchi (frontend uchun)
export interface Driver {
  id: string;
  fullName: string;
  carNumber: string;
  carModel?: string;
  carColor?: string;
  avatarUrl?: string;
  phone?: string;
  qrCode: string;
  isBlocked: boolean;
}

// Baholash so'rovi
export interface RatingRequest {
  driverQrCode: string;
  phone: string; // OTP tasdiqlangan telefon
  overallRating: 1 | 2 | 3 | 4 | 5;
  cleanliness?: 'good' | 'average' | 'bad';
  politeness?: 'good' | 'average' | 'bad';
  drivingStyle?: 'good' | 'average' | 'bad';
  punctuality?: 'good' | 'average' | 'bad';
  comment?: string;
}

// Haydovchi statistikasi (panel uchun)
export interface DriverStats {
  averageRating: number;
  totalRatings: number;
  trend30Days: number; // o'tgan 30 kun o'rtacha
  categoryAverages: {
    cleanliness: number;
    politeness: number;
    drivingStyle: number;
    punctuality: number;
  };
}

// Haydovchi paneli uchun baholash (maxfiy)
export interface DriverRatingView {
  id: string;
  overallRating: number;
  cleanliness?: string;
  politeness?: string;
  drivingStyle?: string;
  punctuality?: string;
  comment?: string;
  monthYear: string; // "2025-01" — aniq sana ko'rsatilmaydi
}

// Oflayn navbat elementi
export interface OfflineRating extends RatingRequest {
  localId: string;
  savedAt: number; // timestamp
  synced: boolean;
}

// Shikoyat
export interface Complaint {
  id: string;
  driverId: string | null;
  driverName: string | null;
  carNumber: string | null;
  phone: string | null;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
  resolution?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
}

// O'chirilgan shikoyat (arxiv)
export interface DeletedComplaint {
  id: string;
  driverId: string | null;
  driverName: string | null;
  carNumber: string | null;
  phone: string | null;
  message: string;
  deletedReason: string;
  deletedAt: string;
  createdAt: string;
}
