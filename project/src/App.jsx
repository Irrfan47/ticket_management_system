import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import CreateTicket from './components/CreateTicket';
import UserManagement from './components/UserManagement';
import Layout from './components/Layout';
import ChangePassword from './components/ChangePassword';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute>
          <TicketList />
        </ProtectedRoute>
      } />
      <Route path="/tickets/:id" element={
        <ProtectedRoute>
          <TicketDetail />
        </ProtectedRoute>
      } />
      <Route path="/create-ticket" element={
        <ProtectedRoute>
          <CreateTicket />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute adminOnly={true}>
          <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <TicketProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </TicketProvider>
    </AuthProvider>
  );
}

export default App;