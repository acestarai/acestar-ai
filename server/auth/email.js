import nodemailer from 'nodemailer';

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@acestarai.com';
const APP_URL = process.env.APP_URL || 'https://app.acestarai.com';
const SMTP_URL = process.env.SMTP_URL || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

let cachedTransporter = null;

export function validateEmailAddress(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  return emailRegex.test(email);
}

export function isBlockedLegacyEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail.includes('@')) return false;
  const domain = normalizedEmail.split('@').pop();
  return domain === 'ibm.com' || domain === 'us.ibm.com' || domain.endsWith('.ibm.com');
}

export function buildVerificationLink(code) {
  return `${APP_URL}/api/auth/verify?token=${encodeURIComponent(code)}`;
}

function hasSmtpConfiguration() {
  return Boolean(SMTP_URL || (SMTP_HOST && SMTP_PORT));
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!hasSmtpConfiguration()) {
    return null;
  }

  if (SMTP_URL) {
    cachedTransporter = nodemailer.createTransport(SMTP_URL);
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: SMTP_USER || SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      : undefined
  });

  return cachedTransporter;
}

async function sendEmail({ to, subject, text, html, fallbackLogLines }) {
  if (isBlockedLegacyEmail(to)) {
    console.warn(`Skipping outbound email to blocked legacy domain recipient: ${to}`);
    return { delivered: false, fallback: false, skipped: true, reason: 'blocked_legacy_domain' };
  }

  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n📧 ========================================');
    console.log(`   ${subject.toUpperCase()}`);
    console.log('========================================');
    console.log(`To: ${to}`);
    console.log(`From: ${EMAIL_FROM}`);
    fallbackLogLines.forEach((line) => console.log(line));
    console.log('========================================\n');
    return { delivered: false, fallback: true };
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html
  });

  return { delivered: true, fallback: false };
}

export async function sendVerificationEmail(email, verificationCode) {
  const verificationLink = buildVerificationLink(verificationCode);
  const subject = 'Verify your AcestarAI account';
  const text = [
    'Verify your AcestarAI account',
    '',
    `Verification code: ${verificationCode}`,
    '',
    'Enter this 6-digit code in AcestarAI, or open the verification link below:',
    verificationLink,
    '',
    'This link and code will expire in 24 hours.'
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #161616;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">AcestarAI</h1>
      <p style="font-size: 16px; margin-bottom: 24px;">Verify your account to start turning meetings into structured, searchable knowledge.</p>
      <div style="border: 1px solid #d0d7de; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; margin-bottom: 8px;">Verification code</div>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.18em; color: #ff0a4d;">${verificationCode}</div>
      </div>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">You can enter this code in the AcestarAI signup screen, or click the button below to verify instantly.</p>
      <a href="${verificationLink}" style="display: inline-block; background: #ff0a4d; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; margin-bottom: 20px;">Verify Email</a>
      <p style="font-size: 13px; color: #525252; line-height: 1.5;">This verification link and code expire in 24 hours. If you did not request this, you can ignore this email.</p>
      <p style="font-size: 13px; color: #525252; line-height: 1.5;">If the button does not work, copy and paste this link into your browser:<br /><a href="${verificationLink}" style="color: #ff0a4d;">${verificationLink}</a></p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLines: [
      '',
      `Verification Code: ${verificationCode}`,
      '',
      'Verification Link:',
      verificationLink,
      '',
      'Enter the code in AcestarAI or open the link to complete account setup.'
    ]
  });
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${APP_URL}/api/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your AcestarAI password';
  const text = [
    'Reset your AcestarAI password',
    '',
    'Open the link below to choose a new password:',
    resetUrl,
    '',
    'This reset link will expire in 1 hour.'
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #161616;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">AcestarAI</h1>
      <p style="font-size: 16px; margin-bottom: 24px;">Open the link below to reset your password.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #ff0a4d; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Reset Password</a>
      <p style="font-size: 13px; color: #525252; line-height: 1.5; margin-top: 20px;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLines: [
      '',
      'Reset Link:',
      resetUrl
    ]
  });
}

export async function sendWelcomeEmail(email, fullName) {
  const subject = 'Welcome to AcestarAI';
  const displayName = fullName || 'there';
  const text = [
    `Hi ${displayName},`,
    '',
    'Your AcestarAI account has been verified successfully.',
    `You can now sign in at ${APP_URL} and start using the app.`
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #161616;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to AcestarAI</h1>
      <p style="font-size: 16px; margin-bottom: 16px;">Hi ${displayName},</p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Your account has been verified successfully. You can now sign in and start converting meetings into structured, searchable knowledge.</p>
      <a href="${APP_URL}" style="display: inline-block; background: #ff0a4d; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Open AcestarAI</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLines: [
      '',
      `Hi ${displayName},`,
      '',
      `Your account has been verified successfully. Open AcestarAI at ${APP_URL}.`
    ]
  });
}

export async function sendMorningPlanningReminderEmail(email, {
  fullName,
  timeZone = 'UTC',
  targetDate,
  meetingsUrl = `${APP_URL}/?tab=meetings`
} = {}) {
  const displayName = fullName || 'there';
  const subject = 'Import today’s meetings into AcestarAI';
  const text = [
    `Hi ${displayName},`,
    '',
    'Import today’s meetings into AcestarAI so nothing gets missed.',
    targetDate ? `Planning date: ${targetDate} (${timeZone})` : null,
    '',
    `Open Meetings: ${meetingsUrl}`
  ].filter(Boolean).join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #161616;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">AcestarAI</h1>
      <p style="font-size: 16px; margin-bottom: 16px;">Hi ${displayName},</p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Import today’s meetings into AcestarAI so nothing gets missed.</p>
      ${targetDate ? `<p style="font-size: 13px; color: #525252; line-height: 1.5; margin-bottom: 20px;">Planning date: ${targetDate} (${timeZone})</p>` : ''}
      <a href="${meetingsUrl}" style="display: inline-block; background: #ff0a4d; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Open Meetings</a>
      <p style="font-size: 13px; color: #525252; line-height: 1.5; margin-top: 20px;">Upload a day-view screenshot, review the detected meetings, and fill in any missing organizer or attendee details.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLines: [
      '',
      `Hi ${displayName},`,
      '',
      'Import today’s meetings into AcestarAI so nothing gets missed.',
      targetDate ? `Planning date: ${targetDate} (${timeZone})` : null,
      '',
      `Open Meetings: ${meetingsUrl}`
    ].filter(Boolean)
  });
}

export async function sendEndOfDayDigestEmail(email, {
  fullName,
  timeZone = 'UTC',
  targetDate,
  summary = {},
  meetingsUrl = `${APP_URL}/?tab=meetings`
} = {}) {
  const displayName = fullName || 'there';
  const total = Number(summary.total || 0);
  const captured = Number(summary.captured || 0);
  const completed = Number(summary.completed || 0);
  const missing = Number(summary.missing || 0);
  const subject = 'Your AcestarAI meeting recap for today';
  const text = [
    `Hi ${displayName},`,
    '',
    targetDate ? `Here’s your AcestarAI meeting recap for ${targetDate} (${timeZone}).` : 'Here’s your AcestarAI meeting recap for today.',
    '',
    `Total meetings entered: ${total}`,
    `Captured with recordings: ${captured}`,
    `Completed with notes: ${completed}`,
    `Still missing: ${missing}`,
    '',
    `Open Meetings: ${meetingsUrl}`
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #161616;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">AcestarAI</h1>
      <p style="font-size: 16px; margin-bottom: 16px;">Hi ${displayName},</p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">${targetDate ? `Here’s your meeting recap for ${targetDate} (${timeZone}).` : 'Here’s your meeting recap for today.'}</p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; margin-bottom: 8px;">Total meetings</div>
          <div style="font-size: 28px; font-weight: 700; color: #161616;">${total}</div>
        </div>
        <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; margin-bottom: 8px;">Captured</div>
          <div style="font-size: 28px; font-weight: 700; color: #161616;">${captured}</div>
        </div>
        <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; margin-bottom: 8px;">Completed</div>
          <div style="font-size: 28px; font-weight: 700; color: #161616;">${completed}</div>
        </div>
        <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; margin-bottom: 8px;">Missing</div>
          <div style="font-size: 28px; font-weight: 700; color: #161616;">${missing}</div>
        </div>
      </div>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">You had ${total} meetings today: ${captured} captured with recordings, ${completed} completed with notes, and ${missing} still missing.</p>
      <a href="${meetingsUrl}" style="display: inline-block; background: #ff0a4d; color: white; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Review Meetings</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLines: [
      '',
      `Hi ${displayName},`,
      '',
      targetDate ? `Meeting recap for ${targetDate} (${timeZone})` : 'Meeting recap for today',
      `Total meetings entered: ${total}`,
      `Captured with recordings: ${captured}`,
      `Completed with notes: ${completed}`,
      `Still missing: ${missing}`,
      '',
      `Open Meetings: ${meetingsUrl}`
    ]
  });
}

console.log('✅ Email utilities initialized');
