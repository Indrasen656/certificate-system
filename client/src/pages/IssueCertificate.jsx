import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './IssueCertificate.css';

const IssueCertificate = () => {
    const [activeTab, setActiveTab] = useState('single');
    const [templateId, setTemplateId] = useState('classic');

    // Single Issuance States
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [course, setCourse] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
    const [status, setStatus] = useState('Active');
    const [expiryDate, setExpiryDate] = useState('');

    // Bulk Issuance States
    const [csvFile, setCsvFile] = useState(null);
    const [parsedCertificates, setParsedCertificates] = useState([]);
    const [bulkSuccess, setBulkSuccess] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null); // single cert success data

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // CSV Parser
    const parseCSV = (text) => {
        const lines = text.split('\n');
        if (lines.length === 0) return [];

        // Grab headers: e.g. studentName, course, studentEmail, rollNumber, status, expiryDate
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = [];
            let currentStr = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentStr.trim());
                    currentStr = '';
                } else {
                    currentStr += char;
                }
            }
            values.push(currentStr.trim());

            const obj = {};
            headers.forEach((header, idx) => {
                if (header) {
                    // Match expected database properties
                    let key = header;
                    // handle basic capitalization mismatch
                    if (header.toLowerCase() === 'name' || header.toLowerCase() === 'studentname') key = 'studentName';
                    if (header.toLowerCase() === 'email' || header.toLowerCase() === 'studentemail') key = 'studentEmail';
                    if (header.toLowerCase() === 'id' || header.toLowerCase() === 'rollnumber') key = 'rollNumber';

                    obj[key] = values[idx] || '';
                }
            });
            results.push(obj);
        }
        return results;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            setError('');
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const rows = parseCSV(text);
                if (rows.length === 0) {
                    setError('No valid data lines found in the CSV file.');
                }
                setParsedCertificates(rows);
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/certificates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentName,
                    studentEmail,
                    rollNumber,
                    course,
                    issueDate,
                    status,
                    expiryDate: expiryDate || undefined,
                    templateId
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to issue certificate');
            }

            setSuccessData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (parsedCertificates.length === 0) {
            setError('Please upload a valid CSV file first.');
            return;
        }

        // Basic validation check before sending
        const invalidRows = parsedCertificates.filter(
            c => !c.studentName || !c.course || !c.studentEmail || !c.rollNumber
        );
        if (invalidRows.length > 0) {
            setError(`Please fix validation issues. All records must contain Student Name, Course, Email, and ID/Roll Number.`);
            return;
        }

        setLoading(true);
        setError('');

        // Merge standard field properties (like issueDate if missing) and the chosen templateId
        const payload = parsedCertificates.map(c => ({
            studentName: c.studentName,
            studentEmail: c.studentEmail,
            rollNumber: c.rollNumber,
            course: c.course,
            issueDate: c.issueDate || new Date().toISOString().substring(0, 10),
            status: c.status || 'Active',
            expiryDate: c.expiryDate || undefined,
            templateId
        }));

        try {
            const response = await fetch('/api/certificates/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ certificates: payload }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process bulk issuance');
            }

            setBulkSuccess(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const validateRow = (row) => {
        const errors = [];
        if (!row.studentName) errors.push('Name missing');
        if (!row.course) errors.push('Course missing');
        if (!row.studentEmail) errors.push('Email missing');
        if (!row.rollNumber) errors.push('ID/Roll missing');
        return errors;
    };

    const resetForms = () => {
        setStudentName('');
        setStudentEmail('');
        setRollNumber('');
        setCourse('');
        setCsvFile(null);
        setParsedCertificates([]);
        setSuccessData(null);
        setBulkSuccess(null);
        setError('');
    };

    const isBulkModeActive = activeTab === 'bulk' && parsedCertificates.length > 0;

    return (
        <div className="issue-container">
            <div className="glow-sphere sphere-1"></div>

            <div className={`issue-card ${isBulkModeActive ? 'wide-card' : ''}`}>
                <div className="card-top-nav">
                    <button
                        type="button"
                        className="back-dashboard-btn"
                        onClick={() => navigate('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {/* 1. If single issuance success */}
                {successData && (
                    <div className="success-view">
                        <div className="success-icon">✓</div>
                        <h2>Certificate Issued Successfully!</h2>
                        <p className="success-desc">The digital credential has been registered in the database ledger.</p>

                        <div className="receipt-box">
                            <div className="receipt-detail">
                                <span className="label">Student Name:</span>
                                <span className="value">{successData.certificate.studentName}</span>
                            </div>
                            <div className="receipt-detail">
                                <span className="label">Student Email:</span>
                                <span className="value">{successData.certificate.studentEmail}</span>
                            </div>
                            <div className="receipt-detail">
                                <span className="label">Student ID/Roll No:</span>
                                <span className="value">{successData.certificate.rollNumber}</span>
                            </div>
                            <div className="receipt-detail">
                                <span className="label">Course:</span>
                                <span className="value">{successData.certificate.course}</span>
                            </div>
                            <div className="receipt-detail">
                                <span className="label">Verification ID:</span>
                                <span className="value monospace">{successData.certificate.verificationId}</span>
                            </div>
                            <div className="receipt-detail">
                                <span className="label">Theme Template:</span>
                                <span className="value capitalize">{successData.certificate.templateId || 'classic'}</span>
                            </div>
                        </div>

                        <div className="qr-preview-box">
                            <img src={successData.qrCode} alt="Verification QR Code" />
                            <p>Generated QR Code for Public Verification</p>
                        </div>

                        <div className="success-actions">
                            <a
                                href={`/api/certificates/download/${successData.certificate._id}`}
                                className="action-btn pdf-btn"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download PDF Certificate
                            </a>
                            <button
                                className="action-btn secondary-btn"
                                onClick={resetForms}
                            >
                                Issue Another Certificate
                            </button>
                            <button
                                className="action-btn secondary-btn"
                                onClick={() => navigate('/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. If bulk issuance success */}
                {bulkSuccess && (
                    <div className="success-view">
                        <div className="success-icon">✓</div>
                        <h2>Batch Issued Successfully!</h2>
                        <p className="success-desc">Successfully generated and registered <strong>{bulkSuccess.count}</strong> credentials in the ledger.</p>

                        <div className="bulk-results-list">
                            <table className="bulk-preview-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Course</th>
                                        <th>ID/Roll Number</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bulkSuccess.certificates.map((certItem) => {
                                        const cert = certItem.certificate || certItem;
                                        return (
                                            <tr key={cert._id}>
                                                <td>{cert.studentName}</td>
                                                <td>{cert.course}</td>
                                                <td>{cert.rollNumber}</td>
                                                <td><span className="status-badge active">{cert.status}</span></td>
                                                <td>
                                                    <a
                                                        href={`/api/certificates/download/${cert._id}`}
                                                        className="btn-text-download"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Download PDF
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="success-actions" style={{ marginTop: '2rem' }}>
                            <button
                                className="action-btn pdf-btn"
                                onClick={resetForms}
                            >
                                Start New Batch
                            </button>
                            <button
                                className="action-btn secondary-btn"
                                onClick={() => navigate('/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Main Form View */}
                {!successData && !bulkSuccess && (
                    <>
                        <h2>Credentials Portal</h2>
                        <p className="subtitle">Choose a template style and issue single or multiple certificates</p>

                        {/* Template Selectors */}
                        <div className="template-picker-group">
                            <label className="picker-label">Design Template Style</label>
                            <div className="templates-grid">
                                <div
                                    className={`template-option-card classic ${templateId === 'classic' ? 'active' : ''}`}
                                    onClick={() => setTemplateId('classic')}
                                >
                                    <div className="template-swatch bg-classic">
                                        <div className="swatch-accent border-classic"></div>
                                    </div>
                                    <span className="template-desc">Classic Accent</span>
                                </div>
                                <div
                                    className={`template-option-card modern_dark ${templateId === 'modern_dark' ? 'active' : ''}`}
                                    onClick={() => setTemplateId('modern_dark')}
                                >
                                    <div className="template-swatch bg-modern-dark">
                                        <div className="swatch-accent border-modern-dark"></div>
                                    </div>
                                    <span className="template-desc">Modern Dark</span>
                                </div>
                                <div
                                    className={`template-option-card tech_minimal ${templateId === 'tech_minimal' ? 'active' : ''}`}
                                    onClick={() => setTemplateId('tech_minimal')}
                                >
                                    <div className="template-swatch bg-tech-minimal">
                                        <div className="swatch-accent border-tech-minimal"></div>
                                    </div>
                                    <span className="template-desc">Tech Minimal</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="portal-tabs-row">
                            <button
                                type="button"
                                className={`portal-tab ${activeTab === 'single' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('single'); setError(''); }}
                            >
                                Single Issuance
                            </button>
                            <button
                                type="button"
                                className={`portal-tab ${activeTab === 'bulk' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('bulk'); setError(''); }}
                            >
                                Bulk CSV Upload
                            </button>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        {/* SINGLE ISSUANCE TAB */}
                        {activeTab === 'single' && (
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="studentName">Student Full Name</label>
                                    <input
                                        type="text"
                                        id="studentName"
                                        placeholder="e.g. John Doe"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="course">Course Name</label>
                                    <input
                                        type="text"
                                        id="course"
                                        placeholder="e.g. Full-Stack Web Development"
                                        value={course}
                                        onChange={(e) => setCourse(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="studentEmail">Student Email Address</label>
                                    <input
                                        type="email"
                                        id="studentEmail"
                                        placeholder="e.g. student@example.com"
                                        value={studentEmail}
                                        onChange={(e) => setStudentEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="rollNumber">Student ID / Roll Number</label>
                                    <input
                                        type="text"
                                        id="rollNumber"
                                        placeholder="e.g. CS-2026-101"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="issueDate">Date of Issue</label>
                                    <input
                                        type="date"
                                        id="issueDate"
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="expiryDate">Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        id="expiryDate"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="status">Initial Status</label>
                                    <select
                                        id="status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Revoked">Revoked</option>
                                    </select>
                                </div>

                                <div className="actions-row">
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => navigate('/dashboard')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn" disabled={loading}>
                                        {loading ? 'Generating...' : 'Generate Certificate'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* BULK ISSUANCE TAB */}
                        {activeTab === 'bulk' && (
                            <form onSubmit={handleBulkSubmit}>
                                <div className="csv-upload-dropzone">
                                    <input
                                        type="file"
                                        id="csvFileSelect"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="csvFileSelect" className="dropzone-label">
                                        <span className="upload-icon">📂</span>
                                        <strong>{csvFile ? csvFile.name : 'Choose CSV File'}</strong>
                                        <span className="upload-details">Click to upload spreadsheet containing certificate rows</span>
                                    </label>
                                </div>

                                <div className="csv-info-note">
                                    <p>✨ <strong>Expected CSV Schema headers:</strong> <code>studentName</code>, <code>course</code>, <code>studentEmail</code>, <code>rollNumber</code>, <code>issueDate (optional)</code>, <code>expiryDate (optional)</code></p>
                                </div>

                                {parsedCertificates.length > 0 && (
                                    <div className="parsed-preview-panel">
                                        <h3>Parsed Certificate Output ({parsedCertificates.length} Records)</h3>
                                        <div className="table-responsive-wrapper">
                                            <table className="preview-records-table">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Course</th>
                                                        <th>Email</th>
                                                        <th>Student ID</th>
                                                        <th>Validation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedCertificates.map((cert, index) => {
                                                        const rowErrors = validateRow(cert);
                                                        const isValid = rowErrors.length === 0;
                                                        return (
                                                            <tr key={index} className={isValid ? '' : 'invalid-row'}>
                                                                <td>{cert.studentName || <span className="missing-span">Missing</span>}</td>
                                                                <td>{cert.course || <span className="missing-span">Missing</span>}</td>
                                                                <td>{cert.studentEmail || <span className="missing-span">Missing</span>}</td>
                                                                <td>{cert.rollNumber || <span className="missing-span">Missing</span>}</td>
                                                                <td>
                                                                    {isValid ? (
                                                                        <span className="badge-pass">✓ Valid</span>
                                                                    ) : (
                                                                        <span className="badge-fail" title={rowErrors.join(', ')}>⚠️ Invalid</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="actions-row">
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => navigate('/dashboard')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={loading || parsedCertificates.length === 0}
                                    >
                                        {loading ? 'Processing Batch...' : `Issue Batch (${parsedCertificates.length} Certificates)`}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default IssueCertificate;