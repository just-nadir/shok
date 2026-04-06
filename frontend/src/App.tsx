import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const QRScanner = React.lazy(() => import('./pages/QRScanner'));
const OTPVerify = React.lazy(() => import('./pages/OTPVerify'));
const RatingForm = React.lazy(() => import('./pages/RatingForm'));
const DriverLogin = React.lazy(() => import('./pages/DriverLogin'));
const DriverDashboard = React.lazy(() => import('./pages/DriverDashboard'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/scan" element={<QRScanner />} />
          <Route path="/otp" element={<OTPVerify />} />
          <Route path="/rate/:qrCode" element={<RatingForm />} />
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute role="driver">
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/scan" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
