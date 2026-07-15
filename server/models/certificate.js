// server/models/Certificate.js
const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    course: { type: String, required: true },
    issueDate: { type: Date, default: Date.now },
    verificationId: { type: String, required: true, unique: true },
    studentEmail: { type: String, required: true },
    rollNumber: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
    expiryDate: { type: Date },
    templateId: { type: String, enum: ['classic', 'modern_dark', 'tech_minimal'], default: 'classic' }
});

module.exports = mongoose.model('Certificate', CertificateSchema);