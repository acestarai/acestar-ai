const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@ibm-recap.com';
const APP_URL = process.env.APP_URL || 'http://localhost:8787';

/**
 * Validate IBM email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid IBM email
 */
export function validateIBMEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@ibm\.com$/i;
  return emailRegex.test(email);
}

/**
 * Send verification email
 * In development, this logs the verification URL to console
 * In production, this should use a proper email service
 * 
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} Success status
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${APP_URL}/api/auth/verify?token=${token}`;
  
  // In development, log the URL
  console.log('\n📧 ========================================');
  console.log('   VERIFICATION EMAIL');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your IBM Recap account`);
  console.log(`\nVerification Link:`);
  console.log(`${verificationUrl}`);
  console.log('========================================\n');
  
  // TODO: In production, integrate with email service:
  // - Supabase Auth (built-in)
  // - SendGrid
  // - AWS SES
  // - Gmail SMTP
  
  return true;
}

/**
 * Send password reset email
 * In development, this logs the reset URL to console
 * In production, this should use a proper email service
 * 
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success status
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${APP_URL}/api/auth/reset-password?token=${token}`;
  
  // In development, log the URL
  console.log('\n📧 ========================================');
  console.log('   PASSWORD RESET EMAIL');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Subject: Reset your IBM Recap password`);
  console.log(`\nReset Link:`);
  console.log(`${resetUrl}`);
  console.log('========================================\n');
  
  // TODO: In production, integrate with email service
  
  return true;
}

/**
 * Send welcome email after successful verification
 * @param {string} email - Recipient email
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>} Success status
 */
export async function sendWelcomeEmail(email, fullName) {
  console.log('\n📧 ========================================');
  console.log('   WELCOME EMAIL');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Subject: Welcome to IBM Recap!`);
  console.log(`\nHi ${fullName || 'there'},`);
  console.log(`\nYour account has been verified successfully!`);
  console.log(`You can now log in and start using IBM Recap.`);
  console.log('========================================\n');
  
  return true;
}

console.log('✅ Email utilities initialized');

// Made with Bob
