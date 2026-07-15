import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchPortal.css';

const SearchPortal = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setResults([]);
        setSearched(false);

        try {
            const response = await fetch(`/api/certificates/search?query=${encodeURIComponent(searchQuery.trim())}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Trouble searching credentials');
            }
            const data = await response.json();
            setResults(Array.isArray(data) ? data : []);
            setSearched(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="search-portal-container">
            <div className="glow-sphere sphere-1"></div>
            <div className="glow-sphere sphere-2"></div>

            <div className="search-card">
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
                <header className="search-header">
                    <h2>Student Certificate Portal</h2>
                    <p className="subtitle">Search and verify official digital credentials instantly</p>
                </header>

                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Enter Certificate Verification ID (Hash ID)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            required
                        />
                        <button type="submit" className="search-btn" disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </form>

                {error && <div className="error-message">{error}</div>}

                {searched && (
                    <div className="results-container">
                        <h3>Search Results ({results.length})</h3>
                        {results.length === 0 ? (
                            <p className="no-results">No certificates found matching your query.</p>
                        ) : (
                            <div className="results-list">
                                {results.map((cert) => (
                                    <div key={cert._id} className="result-item">
                                        <div className="cert-info">
                                            <h4 className="student-name">{cert.studentName}</h4>
                                            <p className="course-title">{cert.course}</p>
                                            <div className="meta-info">
                                                <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                                                <span className="divider">•</span>
                                                <span>ID: <code className="monospace">{cert.verificationId}</code></span>
                                            </div>
                                        </div>
                                        <div className="cert-actions">
                                            <button
                                                className="btn-verify"
                                                onClick={() => navigate(`/verify/${cert.verificationId}`)}
                                                style={{ width: '100%' }}
                                            >
                                                Verify Authenticity
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="portal-footer">
                    <button className="btn-secondary" onClick={() => navigate('/')}>
                        Return to Registry Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchPortal;
