import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchMyCertificates();
    }, [token]);

    const fetchMyCertificates = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/certificates/my-certificates', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    handleLogout();
                    return;
                }
                throw new Error('Failed to fetch certificates');
            }
            const data = await response.json();
            setCertificates(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="student-dashboard-container">
            {/* Top Navbar */}
            <nav className="student-nav">
                <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Certify Portal</div>
                <div className="nav-user">
                    <button
                        type="button"
                        className="nav-home-btn"
                        onClick={() => navigate('/')}
                        style={{
                            marginRight: '1rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'var(--text-secondary)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: '600'
                        }}
                    >
                        Registry Home
                    </button>
                    <span className="user-badge">Student</span>
                    <span className="user-email">{user.name || 'Student'}</span>
                    <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
                </div>
            </nav>

            <main className="student-main">
                {/* Header */}
                <header className="student-header">
                    <div>
                        <h1>My Certificates</h1>
                        <p className="welcome-msg">View, download, and verify your credentials</p>
                    </div>
                </header>

                {/* Stats Grid */}
                <section className="stats-grid">
                    <div className="stat-card">
                        <h3>Certificates Issued</h3>
                        <div className="stat-value">{certificates.length}</div>
                        <p className="stat-desc">Linked to your email ({user.email || 'N/A'})</p>
                    </div>
                    <div className="stat-card">
                        <h3>Status</h3>
                        <div className="stat-value text-success">Verified</div>
                        <p className="stat-desc">Security ledger confirmed</p>
                    </div>
                </section>

                {/* Certificates Section */}
                <section className="certificates-section">
                    <h2>Issued Credentials Registry</h2>

                    {error && <div className="error-message">{error}</div>}

                    {loading ? (
                        <div className="loading-state">Loading your certificates...</div>
                    ) : certificates.length === 0 ? (
                        <div className="empty-state">
                            No certificates have been issued to your email address yet. Please contact your coordinator.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="cert-table">
                                <thead>
                                    <tr>
                                        <th>Course Title</th>
                                        <th>Issue Date</th>
                                        <th>Verification ID</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certificates.map((cert) => (
                                        <tr key={cert._id}>
                                            <td className="font-bold" data-label="Course Title">{cert.course}</td>
                                            <td data-label="Issue Date">{new Date(cert.issueDate).toLocaleDateString()}</td>
                                            <td className="verify-id" data-label="Verification ID">{cert.verificationId}</td>
                                            <td className="actions-cell" data-label="Actions">
                                                <a
                                                    href={`/api/certificates/download/${cert._id}`}
                                                    className="btn-download"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Download PDF
                                                </a>
                                                <button
                                                    className="btn-verify"
                                                    onClick={() => navigate(`/verify/${cert.verificationId}`)}
                                                >
                                                    Verify Online
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default StudentDashboard;
