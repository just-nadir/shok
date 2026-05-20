import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const OTPVerify = React.lazy(() => import('./pages/OTPVerify'));
const ComplaintForm = React.lazy(() => import('./pages/ComplaintForm'));
const DriverSearch = React.lazy(() => import('./pages/DriverSearch'));
const DriverLogin = React.lazy(() => import('./pages/DriverLogin'));
const DriverDashboard = React.lazy(() => import('./pages/DriverDashboard'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ComplaintsDashboard = React.lazy(() => import('./pages/ComplaintsDashboard'));
const DeletedComplaints = React.lazy(() => import('./pages/DeletedComplaints'));

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/otp" element={<OTPVerify />} />
            <Route path="/search" element={<DriverSearch />} />
            <Route path="/r/:driverId" element={<ComplaintForm />} />
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
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute role="admin">
                  <ComplaintsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints/deleted"
              element={
                <ProtectedRoute role="admin">
                  <DeletedComplaints />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/otp" replace />} />
            <Route path="*" element={<Navigate to="/otp" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
