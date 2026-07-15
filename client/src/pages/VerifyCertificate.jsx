import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VerifyCertificate.css';

const VerifyCertificate = () => {
    const { verificationId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);

    useEffect(() => {
        verifyId();
    }, [verificationId]);

    const getNormalizedStatus = (status) => {
        if (!status) return 'Active';
        const normalized = String(status).trim().toLowerCase();
        if (normalized === 'revoked') return 'Revoked';
        if (normalized === 'expired') return 'Expired';
        return 'Active';
    };

    const verifyId = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/certificates/verify/${verificationId}`);
            const data = await response.json();
            if (data.isValid) {
                setResult(data);
            } else {
                setResult(data);
            }
        } catch (err) {
            setResult({ isValid: false, message: 'Server communication error. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    const certificateStatus = result ? getNormalizedStatus(result.certificate?.status) : 'Active';

    return (
        <div className="verify-container">
            <div className="glow-sphere sphere-1"></div>

            <div className="verify-card">
                <div className="card-top-nav">
                    <button
                        type="button"
                        className="back-dashboard-btn"
                        onClick={() => {
                            const token = localStorage.getItem('token');
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            if (token && user.role === 'admin') {
                                navigate('/dashboard');
                            } else if (token && user.role === 'student') {
                                navigate('/student-dashboard');
                            } else {
                                navigate('/');
                            }
                        }}
                    >
                        ← Back to Panel / Home
                    </button>
                </div>
                {loading ? (
                    <div className="verify-loading">
                        <div className="spinner"></div>
                        <h2>Running Ledger Verification...</h2>
                        <p>Querying the database security ledger</p>
                    </div>
                ) : result && result.isValid ? (
                    <div className="verify-success">
                        <div className="badge-wrapper">
                            {(certificateStatus === 'Active') && (
                                <span className="verified-badge status-active">✓ Verified & Active</span>
                            )}
                            {certificateStatus === 'Expired' && (
                                <span className="verified-badge status-expired">⚠ Expired</span>
                            )}
                            {certificateStatus === 'Revoked' && (
                                <span className="verified-badge status-revoked">✖ Revoked (Invalidated)</span>
                            )}
                        </div>
                        <div className="verification-hash-banner">
                            Verified Ledger Hash: <code className="hash-code">{result.certificate.verificationId}</code>
                        </div>
                        <h2>
                            {certificateStatus === 'Active' && "Certificate is Valid"}
                            {certificateStatus === 'Expired' && "Certificate has Expired"}
                            {certificateStatus === 'Revoked' && "Certificate is Revoked"}
                        </h2>
                        <p className="card-subtitle" style={{ color: certificateStatus === 'Revoked' ? '#ef4444' : 'var(--text-secondary)' }}>
                            {certificateStatus === 'Active' && "This educational credential is valid and active."}
                            {certificateStatus === 'Expired' && "This credential has expired and is no longer active."}
                            {certificateStatus === 'Revoked' && "WARNING: This certificate has been revoked due to administrative action or academic record update."}
                        </p>

                        <div className="cert-details-card">
                            <div className="detail-row">
                                <span className="label">Recipient Name</span>
                                <span className="value student-name">{result.certificate.studentName}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Subject / Course</span>
                                <span className="value course-title">{result.certificate.course}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Date of Issue</span>
                                <span className="value">
                                    {new Date(result.certificate.issueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="detail-row row-id">
                                <span className="label">Verification ID</span>
                                <span className="value monospace">{result.certificate.verificationId}</span>
                            </div>
                        </div>

                        <div className="verify-actions">
                            <button className="btn-secondary" onClick={() => navigate(-1)} style={{ width: '100%' }}>
                                Go Back
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="verify-failed">
                        <div className="failed-icon">⚠</div>
                        <h2>Verification Failed</h2>
                        <p className="failed-desc">
                            {result && result.message ? result.message : 'The certificate verification ID is invalid or does not exist.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => navigate(-1)} style={{ flex: 1, padding: '0.4rem 0.8rem', minHeight: '38px' }}>
                                Go Back
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/')} style={{ flex: 1, padding: '0.4rem 0.8rem', minHeight: '38px' }}>
                                Registry Home
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyCertificate;