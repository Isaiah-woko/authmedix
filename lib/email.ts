/**
 * Dev stub: logs the OTP to the console so we can test the flow without a mail server.
 * Swap in nodemailer behind EMAIL_SERVER_* env vars later if time permits.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  console.log(`[AuthMedix OTP] code for ${to}: ${code}`);
}