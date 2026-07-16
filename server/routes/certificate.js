// server/routes/certificates.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); // Used to generate unique verification IDs
const Certificate = require('../models/certificate');
const { verifyToken, authorizeRole } = require('../middleware/auth');
const { sendCertificateEmail } = require('../utils/mailer');

const parseDateValue = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Date) return value;

    const trimmed = String(value).trim();
    if (!trimmed) return undefined;

    // Accept ISO 8601 first, then common human-readable formats like DD-MM-YYYY or DD/MM/YYYY
    const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoMatch) {
        return new Date(trimmed);
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        const [_, day, month, year] = dmyMatch;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeStatus = (status) => {
    if (!status) return 'Active';
    const normalized = String(status).trim().toLowerCase();
    if (normalized === 'revoked') return 'Revoked';
    if (normalized === 'expired') return 'Expired';
    return 'Active';
};

// 1. CREATE: Create a new certificate (Admin only)
const QRCode = require('qrcode');
// CREATE: Create a new certificate with QR code
router.post('/', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { studentName, course, issueDate, studentEmail, rollNumber, status, expiryDate, templateId } = req.body;
        const verificationId = uuidv4();
        // 1. Create the verification URL pointing to your React frontend verification route
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
        const verifyUrl = `${clientUrl}/verify/${verificationId}`;
        // 2. Generate a base64 string representation of the QR code
        const qrCodeImage = await QRCode.toDataURL(verifyUrl);
        // 3. Save a record of the certificate to MongoDB
        const newCertificate = new Certificate({
            studentName,
            course,
            issueDate: parseDateValue(issueDate) || new Date(),
            verificationId,
            studentEmail,
            rollNumber,
            status: normalizeStatus(status),
            expiryDate: parseDateValue(expiryDate) || null,
            templateId: templateId || 'classic'
        });
        await newCertificate.save();

        let emailInfo = null;
        let emailSent = false;
        let emailError = null;
        try {
            emailInfo = await sendCertificateEmail(newCertificate, verifyUrl);
            emailSent = true;
        } catch (sendError) {
            emailError = sendError.message || 'Failed to send email';
            console.error('Email send error:', sendError);
        }

        // 4. Return both the saved document and the QR code base64 string
        res.status(201).json({
            message: 'Certificate created successfully',
            certificate: newCertificate,
            qrCode: qrCodeImage,
            emailSent,
            emailError,
            emailInfo: emailInfo ? { messageId: emailInfo.messageId } : undefined
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE BULK: Create multiple certificates (Admin only)
router.post('/bulk', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { certificates } = req.body;
        if (!certificates || !Array.isArray(certificates)) {
            return res.status(400).json({ error: 'certificates list must be an array' });
        }

        const savedCertificates = [];
        for (const certData of certificates) {
            const { studentName, course, issueDate, studentEmail, rollNumber, status, expiryDate, templateId } = certData;

            // Standard validation
            if (!studentName || !course || !studentEmail || !rollNumber) {
                continue; // Skip invalid rows
            }

            const verificationId = uuidv4();
            const newCertificate = new Certificate({
                studentName,
                course,
                issueDate: parseDateValue(issueDate) || new Date(),
                verificationId,
                studentEmail,
                rollNumber,
                status: normalizeStatus(status),
                expiryDate: parseDateValue(expiryDate) || null,
                templateId: templateId || 'classic'
            });
            await newCertificate.save();

            let emailResult = null;
            let emailSent = false;
            let emailError = null;
            try {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
                const verifyUrl = `${clientUrl}/verify/${verificationId}`;
                emailResult = await sendCertificateEmail(newCertificate, verifyUrl);
                emailSent = true;
            } catch (sendErr) {
                emailError = sendErr.message || 'Failed to send email';
                console.error('Bulk email send error for', studentEmail, sendErr);
            }

            savedCertificates.push({
                certificate: newCertificate,
                emailSent,
                emailError,
                emailInfo: emailResult ? { messageId: emailResult.messageId } : undefined
            });
        }

        res.status(201).json({
            message: `Successfully created ${savedCertificates.length} certificates`,
            count: savedCertificates.length,
            certificates: savedCertificates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. READ ALL: View all certificates (Admin only)
// 2. READ ALL: View all certificates (Admin only)
router.get('/', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const certificates = await Certificate.find();
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2c. SEARCH: Look up certificate by verification ID (Public search ledger lookup)
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Search query:', query);
        if (!query) {
            return res.status(400).json({ message: 'Search ID/hash parameter is required' });
        }

        // Simple exact match first
        const exactMatch = await Certificate.findOne({ verificationId: query.trim() });
        console.log('Exact match result:', exactMatch);
        if (exactMatch) {
            return res.json([exactMatch]);
        }

        // Search by student name, course, or partial verification ID
        const certificates = await Certificate.find({
            $or: [
                { studentName: { $regex: query.trim(), $options: 'i' } },
                { course: { $regex: query.trim(), $options: 'i' } },
                { verificationId: { $regex: query.trim(), $options: 'i' } }
            ]
        });
        console.log('Regex search found:', certificates.length, 'certificates');

        res.json(certificates);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2d. GET /api/certificates/my-certificates - Get certificates matching student's login email
router.get('/my-certificates', verifyToken, async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(400).json({ message: 'User email not found in token' });
        }
        const certificates = await Certificate.find({
            studentEmail: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') }
        });
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2b. VERIFY: Verify a certificate using its verification ID (Public)
router.get('/verify/:verificationId', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ verificationId: req.params.verificationId });
        if (!certificate) {
            return res.status(404).json({ isValid: false, message: 'Certificate is invalid or does not exist' });
        }

        let currentStatus = normalizeStatus(certificate.status);
        if (currentStatus === 'Active' && certificate.expiryDate && new Date() > new Date(certificate.expiryDate)) {
            currentStatus = 'Expired';
        }

        const updatedCertificate = {
            ...certificate.toObject(),
            status: currentStatus
        };

        res.json({ isValid: true, status: currentStatus, certificate: updatedCertificate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2b1. VERIFY WITH CODE: Verify a certificate with verification ID and unique code (roll number)
router.post('/verify', async (req, res) => {
    try {
        const { verificationId, uniqueCode } = req.body;
        
        if (!verificationId || !uniqueCode) {
            return res.status(400).json({ isValid: false, message: 'Verification ID and unique code are required' });
        }

        const certificate = await Certificate.findOne({ 
            verificationId: verificationId,
            rollNumber: uniqueCode 
        });

        if (!certificate) {
            return res.status(404).json({ isValid: false, message: 'Certificate verification failed. Invalid ID or unique code.' });
        }

        let currentStatus = normalizeStatus(certificate.status);
        if (currentStatus === 'Active' && certificate.expiryDate && new Date() > new Date(certificate.expiryDate)) {
            currentStatus = 'Expired';
        }

        const updatedCertificate = {
            ...certificate.toObject(),
            status: currentStatus
        };

        res.json({ isValid: true, status: currentStatus, certificate: updatedCertificate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. UPDATE: Update a certificate (Admin only)
// Note: We search by database ID (_id) for updates
router.put('/:id', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { studentName, course, issueDate, status, expiryDate, templateId } = req.body;
        const normalizedStatus = normalizeStatus(status);

        const updatedCertificate = await Certificate.findByIdAndUpdate(
            req.params.id,
            { studentName, course, issueDate, status: normalizedStatus, expiryDate, templateId },
            { new: true, runValidators: true } // Returns the newly updated document
        );

        if (!updatedCertificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        res.json({ message: 'Certificate updated successfully', certificate: updatedCertificate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. DELETE: Delete a certificate (Admin only)
router.delete('/:id', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const deletedCertificate = await Certificate.findByIdAndDelete(req.params.id);

        if (!deletedCertificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        res.json({ message: 'Certificate deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// server/routes/certificate.js
const PDFDocument = require('pdfkit');

// GET /api/certificates/download/:id (Public or Admin download route)
router.get('/download/:id', async (req, res) => {
    try {
        // 1. Fetch certificate from database
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // 2. Setup the Response Headers for File Download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Certificate_${certificate.studentName.replace(/\s+/g, '_')}.pdf"`
        );

        // 3. Initialize PDF document (A4 Landscape is standard for certificates, margin 0 ensures precise positioning)
        const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
        doc.pipe(res);

        const pageWidth = doc.page.width;   // 841.89
        const pageHeight = doc.page.height; // 595.28

        const template = certificate.templateId || 'classic';

        // Prepare date format
        const formattedDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // 4. Generate QR Code image buffer early since all templates use it
        const verifyUrl = `http://localhost:3000/verify/${certificate.verificationId}`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl);
        const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

        if (template === 'modern_dark') {
            // ==================== MODERN DARK TEMPLATE ====================
            // Background
            doc.rect(0, 0, pageWidth, pageHeight).fill('#111827');

            // Borders
            doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
                .lineWidth(4)
                .strokeColor('#F59E0B') // Warm Gold
                .stroke();

            doc.rect(28, 28, pageWidth - 56, pageHeight - 56)
                .lineWidth(1.5)
                .strokeColor('#D97706') // Darker Gold Accent
                .stroke();

            // Corner decorative triangles
            doc.fillColor('#F59E0B');
            doc.moveTo(35, 35).lineTo(85, 35).lineTo(35, 85).closePath().fill();
            doc.moveTo(pageWidth - 35, 35).lineTo(pageWidth - 85, 35).lineTo(pageWidth - 35, 85).closePath().fill();
            doc.moveTo(35, pageHeight - 35).lineTo(85, pageHeight - 35).lineTo(35, pageHeight - 85).closePath().fill();
            doc.moveTo(pageWidth - 35, pageHeight - 35).lineTo(pageWidth - 85, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 85).closePath().fill();

            // Header Title
            doc.font('Helvetica-Bold')
                .fontSize(36)
                .fillColor('#F59E0B')
                .text('CERTIFICATE OF COMPLETION', 0, 95, { width: pageWidth, align: 'center' });

            // Presenter text
            doc.font('Helvetica')
                .fontSize(16)
                .fillColor('#9CA3AF')
                .text('This is proudly presented to:', 0, 165, { width: pageWidth, align: 'center' });

            // Student Name
            doc.font('Helvetica-Bold')
                .fontSize(32)
                .fillColor('#FFFFFF')
                .text(certificate.studentName, 0, 215, { width: pageWidth, align: 'center' });

            // Accent Line
            doc.moveTo(pageWidth / 2 - 150, 260)
                .lineTo(pageWidth / 2 + 150, 260)
                .lineWidth(2)
                .strokeColor('#F59E0B')
                .stroke();

            // Course subtitle
            doc.font('Helvetica')
                .fontSize(16)
                .fillColor('#9CA3AF')
                .text('for successfully completing the course', 0, 285, { width: pageWidth, align: 'center' });

            // Course name
            doc.font('Helvetica-Bold')
                .fontSize(24)
                .fillColor('#FBBF24')
                .text(certificate.course, 0, 330, { width: pageWidth, align: 'center' });

            // Date and Verification ID (Bottom Left)
            doc.font('Helvetica')
                .fontSize(12)
                .fillColor('#E5E7EB')
                .text(`Date of Issue: ${formattedDate}`, 60, 460);

            doc.font('Helvetica-Oblique')
                .fontSize(10)
                .fillColor('#9CA3AF')
                .text(`Verification ID: ${certificate.verificationId}`, 60, 485);

            // QR Code (Bottom Right on a White Card for Contrast/Scanability)
            doc.fillColor('#FFFFFF');
            doc.rect(pageWidth - 170, 410, 110, 120).fill(); // White card background
            doc.image(qrImageBuffer, pageWidth - 160, 420, { width: 90 });
            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#111827')
                .text('Scan to Verify', pageWidth - 170, 520, { width: 110, align: 'center' });

        } else if (template === 'tech_minimal') {
            // ==================== TECH MINIMAL TEMPLATE ====================
            // Background
            doc.rect(0, 0, pageWidth, pageHeight).fill('#FAFAFA');

            // Cyber accents
            doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
                .lineWidth(2)
                .strokeColor('#2563EB') // Cobalt Blue
                .stroke();

            doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
                .lineWidth(1)
                .strokeColor('#10B981') // Cyber Green
                .stroke();

            // Title
            doc.font('Courier-Bold')
                .fontSize(32)
                .fillColor('#1E293B')
                .text('CREDENTIAL OF COMPLETION', 0, 100, { width: pageWidth, align: 'center' });

            // Prefix text
            doc.font('Courier')
                .fontSize(14)
                .fillColor('#64748B')
                .text('This verifies that', 0, 170, { width: pageWidth, align: 'center' });

            // Student Name
            doc.font('Courier-Bold')
                .fontSize(30)
                .fillColor('#10B981')
                .text(certificate.studentName, 0, 215, { width: pageWidth, align: 'center' });

            // Divider bar
            doc.rect(pageWidth / 2 - 120, 260, 240, 2)
                .fillColor('#2563EB')
                .fill();

            // Subtitle
            doc.font('Courier')
                .fontSize(14)
                .fillColor('#64748B')
                .text('has successfully completed the specialization', 0, 285, { width: pageWidth, align: 'center' });

            // Course Name
            doc.font('Courier-Bold')
                .fontSize(22)
                .fillColor('#2563EB')
                .text(certificate.course, 0, 330, { width: pageWidth, align: 'center' });

            // Details (Bottom Left)
            doc.font('Courier')
                .fontSize(11)
                .fillColor('#334155')
                .text(`ISSUE_DATE :: ${formattedDate}`, 60, 460);

            doc.font('Courier')
                .fontSize(9)
                .fillColor('#64748B')
                .text(`VERIFY_HASH:: ${certificate.verificationId}`, 60, 485);

            // QR Code (Bottom Right)
            doc.image(qrImageBuffer, pageWidth - 160, 420, { width: 90 });
            doc.font('Courier')
                .fontSize(8)
                .fillColor('#64748B')
                .text('INTEGRITY SCANNER', pageWidth - 170, 520, { width: 110, align: 'center' });

        } else {
            // ==================== CLASSIC TEMPLATE (DEFAULT) ====================
            // 4. Draw a Premium Border
            doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
                .lineWidth(4)
                .strokeColor('#1d3557') // Deep Navy Blue
                .stroke();

            doc.rect(28, 28, pageWidth - 56, pageHeight - 56)
                .lineWidth(1.5)
                .strokeColor('#e63946') // Elegant Red accent line
                .stroke();

            // Draw decorative premium geometric corner badges
            doc.fillColor('#1d3557');
            doc.moveTo(35, 35).lineTo(85, 35).lineTo(35, 85).closePath().fill();
            doc.moveTo(pageWidth - 35, 35).lineTo(pageWidth - 85, 35).lineTo(pageWidth - 35, 85).closePath().fill();
            doc.moveTo(35, pageHeight - 35).lineTo(85, pageHeight - 35).lineTo(35, pageHeight - 85).closePath().fill();
            doc.moveTo(pageWidth - 35, pageHeight - 35).lineTo(pageWidth - 85, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 85).closePath().fill();

            // 5. Add Certificate Text Content
            doc.font('Helvetica-Bold')
                .fontSize(36)
                .fillColor('#1d3557')
                .text('CERTIFICATE OF COMPLETION', 0, 95, { width: pageWidth, align: 'center' });

            doc.font('Helvetica')
                .fontSize(16)
                .fillColor('#457b9d')
                .text('This is proudly presented to:', 0, 165, { width: pageWidth, align: 'center' });

            doc.font('Helvetica-Bold')
                .fontSize(32)
                .fillColor('#e63946')
                .text(certificate.studentName, 0, 215, { width: pageWidth, align: 'center' });

            doc.moveTo(pageWidth / 2 - 150, 260)
                .lineTo(pageWidth / 2 + 150, 260)
                .lineWidth(2)
                .strokeColor('#e63946')
                .stroke();

            doc.font('Helvetica')
                .fontSize(16)
                .fillColor('#457b9d')
                .text('for successfully completing the course', 0, 285, { width: pageWidth, align: 'center' });

            doc.font('Helvetica-Bold')
                .fontSize(24)
                .fillColor('#128c7e')
                .text(certificate.course, 0, 330, { width: pageWidth, align: 'center' });

            // 6. Draw Issue Date (Bottom Left)
            doc.font('Helvetica')
                .fontSize(12)
                .fillColor('#1d3557')
                .text(`Date of Issue: ${formattedDate}`, 60, 460);

            doc.font('Helvetica-Oblique')
                .fontSize(10)
                .fillColor('#457b9d')
                .text(`Verification ID: ${certificate.verificationId}`, 60, 485);

            // 7. Embed QR Code (Bottom Right)
            doc.image(qrImageBuffer, pageWidth - 160, 420, { width: 90 });
            doc.font('Helvetica')
                .fontSize(8)
                .fillColor('#457b9d')
                .text('Scan to Verify Legitimacy', pageWidth - 170, 520, { width: 110, align: 'center' });
        }

        // 8. Finalize the document and close connection
        doc.end();

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;