
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const getFrontendUrl = () =>
    process.env.FRONTEND_URL || "http://localhost:5173";

const sendStaffWelcomeEmail = async ({
    recipientEmail,
    firstName,
    role,
    temporaryPassword
}) => {
    const roleLabel = role === "DOCTOR" ? "Doctor" : "Receptionist";
    const frontendUrl = getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;

    const mailOptions = {
        from: `"Vhutec Med" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: "Your Vhutec Med Staff Account",
        html: `
            <div style="font-family:Arial,sans-serif;background:#f5f8f8;padding:40px 20px">
                <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
                    <h2 style="color:#0f766e">Welcome to Vhutec Med</h2>
                    <p>Hello ${firstName},</p>
                    <p>Your Vhutec Med ${roleLabel} account has been created by an administrator.</p>
                    <p><strong>Role:</strong> ${roleLabel}</p>
                    <p><strong>Email:</strong> ${recipientEmail}</p>
                    <p><strong>Temporary password:</strong> ${temporaryPassword}</p>
                    <p><a href="${loginUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Login to Vhutec Med</a></p>
                    <p style="color:#64748b;font-size:14px">For security, change your password after your first login.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0">
                    <p style="color:#94a3b8;font-size:12px">Automated email from Vhutec Med. Please do not reply.</p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Staff email sent successfully:", info.messageId);
    return info;
};

const sendPatientWelcomeEmail = async ({
    recipientEmail,
    firstName,
    patientNumber
}) => {
    const loginUrl = `${getFrontendUrl()}/login`;

    const mailOptions = {
        from: `"Vhutec Med" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: "Welcome to Vhutec Med - Patient Registration Successful",
        html: `
            <div style="font-family:Arial,sans-serif;background:#f5f8f8;padding:40px 20px">
                <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
                    <h2 style="color:#0f766e">Welcome to Vhutec Med</h2>
                    <p>Hello ${firstName},</p>
                    <p>Your Vhutec Med patient account has been created successfully.</p>
                    <p><strong>Patient Number:</strong> ${patientNumber}</p>
                    <p><strong>Email:</strong> ${recipientEmail}</p>
                    <p>Please keep your patient number safe for future healthcare visits.</p>
                    <p><a href="${loginUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Login to Vhutec Med</a></p>
                    <hr style="border:none;border-top:1px solid #e2e8f0">
                    <p style="color:#94a3b8;font-size:12px">Automated email from Vhutec Med. Please do not reply.</p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Patient welcome email sent successfully:", info.messageId);
    return info;
};

const sendPatientVerificationEmail = async ({
    recipientEmail,
    firstName,
    verificationToken
}) => {
    const verificationUrl =
        `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const mailOptions = {
        from: `"Vhutec Med" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: "Verify Your Vhutec Med Email Address",
        html: `
            <div style="font-family:Arial,sans-serif;background:#f5f8f8;padding:40px 20px">
                <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
                    <h2 style="color:#0f766e">Verify Your Email</h2>
                    <p>Hello ${firstName},</p>
                    <p>Thank you for creating your Vhutec Med patient account.</p>
                    <p>Please verify your email address to activate your account.</p>
                    <p style="margin:28px 0;text-align:center">
                        <a href="${verificationUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:bold">Verify My Email</a>
                    </p>
                    <p style="color:#64748b;font-size:14px">This verification link expires in 24 hours.</p>
                    <p style="color:#64748b;font-size:14px">If you did not create this account, you can ignore this email.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0">
                    <p style="color:#94a3b8;font-size:12px">Automated email from Vhutec Med. Please do not reply.</p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Patient verification email sent successfully:", info.messageId);
    return info;
};

const sendPasswordResetEmail = async ({
    recipientEmail,
    firstName,
    resetUrl
}) => {
    const mailOptions = {
        from: `"Vhutec Med" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: "Reset Your Vhutec Med Password",
        html: `
            <div style="font-family:Arial,sans-serif;background:#f5f8f8;padding:40px 20px">
                <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
                    <h2 style="color:#0f766e">Reset Your Vhutec Med Password</h2>
                    <p>Hello ${firstName || "there"},</p>
                    <p>We received a request to reset your Vhutec Med account password.</p>
                    <p>Click below to create a new password.</p>
                    <p style="margin:28px 0">
                        <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Reset My Password</a>
                    </p>
                    <p style="color:#64748b;font-size:14px">This password reset link expires in 30 minutes.</p>
                    <p style="color:#64748b;font-size:14px">If you did not request a reset, you can ignore this email.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0">
                    <p style="color:#94a3b8;font-size:12px">Automated email from Vhutec Med. Please do not reply.</p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully:", info.messageId);
    return info;
};

module.exports = {
    sendStaffWelcomeEmail,
    sendPatientWelcomeEmail,
    sendPatientVerificationEmail,
    sendPasswordResetEmail
};