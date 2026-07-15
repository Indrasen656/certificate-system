import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, useConfirm } from '../components/UIFeedback.jsx';
import './Dashboard.css';

const Dashboard = () => {
    const [certificates, setCertificates] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/certificates', {
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

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Delete certificate?',
            message: 'This will permanently remove the certificate record. This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        });
        if (!ok) return;

        try {
            const response = await fetch(`/api/certificates/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete certificate');
            }

            setCertificates(certificates.filter(cert => cert._id !== id));
            toast.success('Certificate deleted successfully.');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'Revoked' ? 'Active' : 'Revoked';
        const isReinstating = currentStatus === 'Revoked';

        const ok = await confirm({
            title: isReinstating ? 'Reinstate certificate?' : 'Revoke certificate?',
            message: isReinstating
                ? 'This will mark the certificate as Active again.'
                : 'Recruiters and verifiers will see this certificate as Revoked.',
            confirmText: isReinstating ? 'Reinstate' : 'Revoke',
            danger: !isReinstating,
        });
        if (!ok) return;

        try {
            const response = await fetch(`/api/certificates/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update certificate status');
            }

            const data = await response.json();
            setCertificates(certificates.map(cert =>
                cert._id === id ? { ...cert, status: data.certificate.status } : cert
            ));
            toast.success(isReinstating ? 'Certificate reinstated.' : 'Certificate revoked.');
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Filter certificates based on search (by Student Name or Verification ID)
    const filteredCertificates = certificates.filter(cert => {
        const query = searchQuery.toLowerCase();
        return (
            (cert.studentName?.toLowerCase() || '').includes(query) ||
            (cert.course?.toLowerCase() || '').includes(query) ||
            (cert.verificationId?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="dashboard-container">
            {/* Top Navbar */}
            <nav className="dashboard-nav">
                <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Certify Registry</div>
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
                    <span className="user-badge">Admin</span>
                    <span className="user-email">{user.name || 'Administrator'}</span>
                    <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Header */}
                <header className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p className="welcome-msg">Manage, issue and verify student credentials</p>
                    </div>
                    <button className="action-btn" onClick={() => navigate('/issue')}>
                        + Issue New Certificate
                    </button>
                </header>

                {/* Stats Grid */}
                <section className="stats-grid">
                    <div className="stat-card">
                        <h3>Total Issued</h3>
                        <div className="stat-value">{certificates.length}</div>
                        <p className="stat-desc">Verified credentials</p>
                    </div>
                    <div className="stat-card">
                        <h3>Unique Courses</h3>
                        <div className="stat-value">
                            {new Set(certificates.map(c => c.course).filter(Boolean)).size}
                        </div>
                        <p className="stat-desc">Standard modules</p>
                    </div>
                    <div className="stat-card">
                        <h3>Security Ledger</h3>
                        <div className="stat-value text-success">Active</div>
                        <p className="stat-desc">Public verification server online</p>
                    </div>
                </section>

                {/* Certificates Table Area */}
                <section className="certificates-section">
                    <div className="table-header">
                        <h2>Certificates Registry</h2>
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search name, course or Verification ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {loading ? (
                        <div className="loading-state">Loading registry database...</div>
                    ) : filteredCertificates.length === 0 ? (
                        <div className="empty-state">
                            No certificates found matching your query.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="cert-table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Course Title</th>
                                        <th>Issue Date</th>
                                        <th>Verification ID</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCertificates.map((cert) => {
                                        // Compute dynamic status if expired
                                        let currentStatus = cert.status || 'Active';
                                        if (currentStatus === 'Active' && cert.expiryDate && new Date() > new Date(cert.expiryDate)) {
                                            currentStatus = 'Expired';
                                        }
                                        return (
                                            <tr key={cert._id}>
                                                <td className="font-bold" data-label="Student Name">{cert.studentName}</td>
                                                <td data-label="Course Title">{cert.course}</td>
                                                <td data-label="Issue Date">{new Date(cert.issueDate).toLocaleDateString()}</td>
                                                <td className="verify-id" data-label="Verification ID">{cert.verificationId}</td>
                                                <td data-label="Status">
                                                    <span className={`status-pill ${currentStatus.toLowerCase()}`}>
                                                        {currentStatus}
                                                    </span>
                                                </td>
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
                                                        Verify
                                                    </button>
                                                    <button
                                                        className={`btn-revoke-toggle ${currentStatus === 'Revoked' ? 'reinstate' : 'revoke'}`}
                                                        onClick={() => handleToggleStatus(cert._id, currentStatus)}
                                                        disabled={currentStatus === 'Expired'}
                                                        title={currentStatus === 'Expired' ? 'Expired certificates cannot be revoked' : ''}
                                                    >
                                                        {currentStatus === 'Revoked' ? 'Reinstate' : 'Revoke'}
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(cert._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;