const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendStaffWelcomeEmail = async ({
    recipientEmail,
    firstName,
    role,
    temporaryPassword
}) => {
    const roleLabel =
        role === "DOCTOR"
            ? "Doctor"
            : "Receptionist";

    const loginUrl =
        process.env.FRONTEND_URL || "http://localhost:5173";

    const mailOptions = {
        from: `"Vhutec Med" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: "Your Vhutec Med Staff Account",

        html: `
            <div style="
                font-family: Arial, sans-serif;
                background-color: #f5f8f8;
                padding: 40px 20px;
            ">
                <div style="
                    max-width: 600px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 32px;
                    border: 1px solid #e2e8f0;
                ">
                    <h2 style="
                        color: #0f766e;
                        margin-bottom: 10px;
                    ">
                        Welcome to Vhutec Med
                    </h2>

                    <p style="color: #475569;">
                        Hello ${firstName},
                    </p>

                    <p style="color: #475569;">
                        Your Vhutec Med ${roleLabel} account has been
                        successfully created by an administrator.
                    </p>

                    <div style="
                        background: #f0fdfa;
                        border-left: 4px solid #0f766e;
                        padding: 18px;
                        margin: 24px 0;
                    ">
                        <p style="margin: 6px 0;">
                            <strong>Role:</strong> ${roleLabel}
                        </p>

                        <p style="margin: 6px 0;">
                            <strong>Email:</strong> ${recipientEmail}
                        </p>

                        <p style="margin: 6px 0;">
                            <strong>Temporary Password:</strong>
                            ${temporaryPassword}
                        </p>
                    </div>

                    <p style="color: #475569;">
                        You can log in using the following link:
                    </p>

                    <p>
                        <a
                            href="${loginUrl}"
                            style="
                                display: inline-block;
                                background: #0f766e;
                                color: #ffffff;
                                text-decoration: none;
                                padding: 12px 20px;
                                border-radius: 8px;
                                font-weight: bold;
                            "
                        >
                            Login to Vhutec Med
                        </a>
                    </p>

                    <p style="
                        color: #64748b;
                        font-size: 14px;
                        margin-top: 30px;
                    ">
                        For security, please change your password after
                        your first login.
                    </p>

                    <hr style="
                        border: none;
                        border-top: 1px solid #e2e8f0;
                        margin: 30px 0;
                    ">

                    <p style="
                        color: #94a3b8;
                        font-size: 12px;
                    ">
                        This is an automated email from Vhutec Med.
                        Please do not reply to this email.
                    </p>
                </div>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
        "Staff email sent successfully:",
        info.messageId
    );

    return info;
};

module.exports = {
    sendStaffWelcomeEmail
};