import nodemailer from 'nodemailer';

// Create the transporter once (singleton)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, code: string) {
  if (!process.env.SMTP_PASS) {
    throw new Error('SMTP credentials are missing');
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject: 'Your MediTrust Verification Code',
      text: `Your MediTrust verification code is: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #161B22;">
          <h2 style="color: #2B3A67; margin-bottom: 10px;">MediTrust Verification</h2>
          <p style="margin-bottom: 20px;">Your one-time verification code is:</p>
          <h1 style="font-family: 'IBM Plex Mono', monospace; background: #F7F8FA; padding: 15px; border-radius: 6px; letter-spacing: 4px; text-align: center; border: 1px solid #5B6472;">${code}</h1>
          <p style="color: #5B6472; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    // Only log success, NEVER log the code itself
    console.log(`[Email] OTP email sent successfully to ${to}`);
  } catch (error) {
    console.error('[Email] Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  }
}