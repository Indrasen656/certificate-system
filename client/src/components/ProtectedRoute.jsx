import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = {};
    try {
        user = JSON.parse(userStr || '{}');
    } catch (e) {
        user = {};
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;