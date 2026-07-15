import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <div className="glow-sphere sphere-1"></div>
            <div className="glow-sphere sphere-2"></div>
            <div className="glow-sphere sphere-3"></div>

            <div className="home-content">
                <header className="home-header animate-fade-in">
                    <div className="logo-brand">Certify Registry</div>
                    <div className="version-tag">Secured with Cryptography</div>
                </header>

                <main className="home-main">
                    <section className="hero-section animate-fade-in-delayed">
                        <h1 className="hero-title">
                            Next-Generation <br />
                            <span>Credential Registry & Verification</span>
                        </h1>
                        <p className="hero-subtitle">
                            An immutable, instant verification system for educational institutions, students, and recruiters.
                        </p>
                    </section>

                    <section className="portal-grid animate-slide-up">
                        {/* Search Card */}
                        <div className="portal-card" onClick={() => navigate('/search')}>
                            <div className="portal-icon search-icon">🔍</div>
                            <h3>Public Verification Portal</h3>
                            <p>Verify certificate authenticity or lookup student credential records instantly.</p>
                            <span className="portal-link">Verify Credentials &rarr;</span>
                        </div>

                        {/* Student Card */}
                        <div className="portal-card" onClick={() => navigate('/login')}>
                            <div className="portal-icon student-icon">🎓</div>
                            <h3>Student Portal</h3>
                            <p>Login to view your certificates, track progress, and download verified PDFs.</p>
                            <span className="portal-link">Access Certificates &rarr;</span>
                        </div>

                        {/* Admin Card */}
                        <div className="portal-card" onClick={() => navigate('/admin-login')}>
                            <div className="portal-icon admin-icon">💼</div>
                            <h3>Admin Console</h3>
                            <p>For authorized staff. Issue new certificates, manage student records, and audits.</p>
                            <span className="portal-link">Institutional Admin &rarr;</span>
                        </div>
                    </section>
                </main>

                <footer className="home-footer animate-fade-in-delayed">
                    <p>&copy; {new Date().getFullYear()} Certify Registry. All rights reserved. Secured with JWT & SHA-256 Ledgering.</p>
                </footer>
            </div>
        </div>
    );
};

export default Home;
