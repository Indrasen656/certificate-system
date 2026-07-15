import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import IssueCertificate from './pages/IssueCertificate';
import VerifyCertificate from './pages/VerifyCertificate';
import SearchPortal from './pages/SearchPortal';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify/:verificationId" element={<VerifyCertificate />} />
                <Route path="/search" element={<SearchPortal />} />

                {/* Protected Routes (Admin only) */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/issue"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <IssueCertificate />
                        </ProtectedRoute>
                    }
                />

                {/* Protected Routes (Student only) */}
                <Route
                    path="/student-dashboard"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <StudentDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback Redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;