import nodemailer from 'nodemailer';
import { config } from '../config/env.config.js';

let transporter = null;

// Initialize transporter if credentials are provided
if (config.email.user && config.email.pass) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
}

/**
 * Send password reset OTP email
 * @param {string} email 
 * @param {string} otp 
 * @returns {Promise<boolean>}
 */
export const sendOtpEmail = async (email, otp) => {
  const subject = 'Password Reset OTP - Kabeer Earth Movers';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0f19; color: #ffffff; border-radius: 10px;">
      <h2 style="color: #f59e0b; margin-bottom: 10px;">Kabeer Earth Movers</h2>
      <p style="color: #9ca3af; font-size: 16px;">Aapka password reset OTP request receive hua hai.</p>
      <div style="background-color: #1f2937; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f59e0b;">${otp}</span>
      </div>
      <p style="color: #9ca3af; font-size: 14px;">Yeh OTP agle <strong>10 minutes</strong> tak valid rahega. Kripya ise kisi ke sath share na karein.</p>
    </div>
  `;

  // If SMTP is not configured, log to console for development testing
  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SERVICE - DEVELOPMENT MODE]`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Valid for: 10 minutes`);
    console.log(`(Configure SMTP_USER & SMTP_PASS in .env to send real emails)`);
    console.log(`======================================================\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"${config.email.from}" <${config.email.user}>`,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send OTP email via SMTP:', error.message);
    // Still log in console so dev flow does not break
    console.log(`[DEV FALLBACK] OTP for ${email} is: ${otp}`);
    return false;
  }
};
