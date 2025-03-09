import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Navbar } from './components/Navbar';
import { useStore } from './lib/store';
import { Completo } from './pages/Completo';
import { Operacional } from './pages/Operacional';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  const isAdmin = user?.email === 'admin@example.com'; // Replace with your admin check
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/cart"
              element={
                <PrivateRoute>
                  <Cart />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Completo />
                </AdminRoute>
              }
            />
            <Route
              path="/operacional"
              element={
                <AdminRoute>
                  <Operacional />
                </AdminRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}