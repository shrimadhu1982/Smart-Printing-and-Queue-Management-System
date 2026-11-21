import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { AdminLogin } from './pages/auth/AdminLogin';
import { StaffLogin } from './pages/auth/StaffLogin';
import { Register } from './pages/auth/Register';
import { AdminRegistration } from './pages/auth/AdminRegistration';
import { Welcome } from './pages/auth/Welcome';
import { NotFound } from './pages/NotFound';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { NewOrder } from './pages/student/NewOrder';
import { QueuePage } from './pages/student/QueuePage';
import { OrderHistory } from './pages/student/OrderHistory';
import { StudentProfile } from './pages/student/StudentProfile';
import { StudentDocuments } from './pages/student/StudentDocuments';

// Staff Pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffOrders } from './pages/staff/StaffOrders';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { StaffManagement } from './pages/admin/StaffManagement';
import { AdminOrders } from './pages/admin/AdminOrders';
import { PricingManagement } from './pages/admin/PricingManagement';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminDocuments } from './pages/admin/AdminDocuments';

export const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login defaultRole="student" fixedRole />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/register" element={<AdminRegistration />} />

      {/* Authenticated Layout Routes */}
      <Route element={<Layout />}>
        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/new-order"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/queue"
          element={
            <ProtectedRoute allowedRoles={['student', 'staff', 'admin']}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/history"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/documents"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDocuments />
            </ProtectedRoute>
          }
        />

        {/* Staff Routes */}
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/orders"
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffOrders />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PricingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDocuments />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
