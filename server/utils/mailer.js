const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
});

async function sendCertificateEmail(certificate, verifyUrl) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT) {
    throw new Error('Missing SMTP configuration: EMAIL_HOST and EMAIL_PORT must be set.');
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Missing SMTP credentials: EMAIL_USER and EMAIL_PASS must be set.');
  }

  await transporter.verify();

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const to = certificate.studentEmail;
  const subject = `Your certificate for ${certificate.course}`;
  const formattedDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const text = `Certificate issued for ${certificate.studentName}\n
Course: ${certificate.course}\n
Verification ID: ${certificate.verificationId}\n
Issue Date: ${formattedDate}\n
Roll Number: ${certificate.rollNumber}\n
Verify here: ${verifyUrl}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
      <h2 style="color:#1a73e8;">Certificate Issued</h2>
      <p>Dear ${certificate.studentName},</p>
      <p>Your certificate for <strong>${certificate.course}</strong> has been issued successfully.</p>
      <p><strong>Verification ID:</strong> ${certificate.verificationId}</p>
      <p><strong>Issue Date:</strong> ${formattedDate}</p>
      <p><strong>Roll Number:</strong> ${certificate.rollNumber}</p>
      <p>To verify your certificate, open the following link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you have any questions, please contact the administrator.</p>
      <hr />
      <p style="font-size:0.9em;color:#555;">This email was sent automatically by the certificate system.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return info;
}

module.exports = { sendCertificateEmail };
