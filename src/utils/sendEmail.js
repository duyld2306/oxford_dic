import nodemailer from "nodemailer";
import env from "../config/env.js";

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async init() {
    if (this.transporter) return;

    const emailUser = env.EMAIL_USER;
    const emailPass = env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.warn(
        "⚠️ Email credentials not configured. Email functionality will be disabled."
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log("✅ Email service initialized successfully");
    } catch (error) {
      console.error("❌ Email service initialization failed:", error.message);
      this.transporter = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    await this.init();

    if (!this.transporter) {
      console.warn("Email service not available. Skipping email send.");
      return { success: false, message: "Email service not configured" };
    }

    try {
      const emailUser = env.EMAIL_USER;

      const mailOptions = {
        from: `"Oxford Dictionary" <${emailUser}>`,
        to,
        subject,
        html,
        text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async sendVerificationEmail(email, token) {
    const clientUrl = env.CLIENT_URL;
    const verificationUrl = `${clientUrl}/verify/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; color: #fff !important; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Oxford Dictionary!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with Oxford Dictionary. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Oxford Dictionary!
      
      Please verify your email address by visiting this link:
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
    `;

    return await this.sendEmail({
      to: email,
      subject: "Verify Your Email - Oxford Dictionary",
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email, token) {
    const clientUrl = env.CLIENT_URL;
    const resetUrl = `${clientUrl}/reset-password/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; color: #fff !important; #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password for your Oxford Dictionary account. Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This password reset link will expire in 15 minutes.</p>
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      We received a request to reset your password for your Oxford Dictionary account.
      
      Please reset your password by visiting this link:
      ${resetUrl}
      
      This password reset link will expire in 15 minutes.
      
      If you didn't request a password reset, please ignore this email.
    `;

    return await this.sendEmail({
      to: email,
      subject: "Reset Your Password - Oxford Dictionary",
      html,
      text,
    });
  }
}

// Singleton instance
const emailService = new EmailService();
export default emailService;
