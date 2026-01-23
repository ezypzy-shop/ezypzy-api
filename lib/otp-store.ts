// In-memory OTP storage (use Redis in production)
export const otpStore = new Map<string, { otp: string; createdAt: number }>();

// OTP validity: 5 minutes
export const OTP_VALIDITY = 5 * 60 * 1000;

// Cleanup expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (now - data.createdAt > OTP_VALIDITY) {
      otpStore.delete(phone);
    }
  }
}, 10 * 60 * 1000);
