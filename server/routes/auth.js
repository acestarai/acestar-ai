import express from 'express';
import { supabase } from '../auth/supabase.js';
import { hashPassword, comparePassword, validatePassword } from '../auth/password.js';
import { generateToken, generateRandomToken, hashToken } from '../auth/jwt.js';
import { validateIBMEmail, sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../auth/email.js';
import { authenticate } from '../auth/middleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new user with IBM email
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Validate IBM email
    if (!validateIBMEmail(email)) {
      return res.status(400).json({ 
        error: 'Only IBM email addresses (@ibm.com) are allowed',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.errors.join(', '),
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists. Please log in.',
        code: 'USER_EXISTS'
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user with email_verified set to true (auto-verify IBM emails)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName || null,
        email_verified: true  // Auto-verify IBM emails
      })
      .select('id, email, full_name')
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        error: 'Failed to create user. Please try again.',
        code: 'CREATE_USER_FAILED'
      });
    }
    
    res.status(201).json({
      message: 'Account created successfully! You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      code: 'REGISTRATION_FAILED'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Compare password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user.id, user.email);
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // Create session
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.',
      code: 'LOGIN_FAILED'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify email address with token
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    const tokenHash = hashToken(token);
    
    // Find user with this token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, verification_token_expires')
      .eq('verification_token', tokenHash)
      .single();
    
    if (error || !user) {
      return res.status(400).json({ 
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check if token expired
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ 
        error: 'Verification token has expired. Please request a new one.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Update user
    await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', user.id);
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.full_name);
    
    res.json({ 
      message: 'Email verified successfully! You can now log in.',
      success: true
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed. Please try again.',
      code: 'VERIFICATION_FAILED'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email.toLowerCase())
      .single();
    
    // Always return success (don't reveal if user exists)
    if (!user) {
      return res.json({ message: 'If an account exists, a verification email has been sent.' });
    }
    
    if (user.email_verified) {
      return res.json({ message: 'Email is already verified. You can log in.' });
    }
    
    // Generate new verification token
    const verificationToken = generateRandomToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Update user
    await supabase
      .from('users')
      .update({
        verification_token: verificationTokenHash,
        verification_token_expires: verificationTokenExpires.toISOString()
      })
      .eq('id', user.id);
    
    // Send verification email
    await sendVerificationEmail(email, verificationToken);
    
    res.json({ message: 'If an account exists, a verification email has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      error: 'Failed to resend verification email',
      code: 'RESEND_FAILED'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();
    
    // Always return success (don't reveal if user exists)
    if (!user) {
      return res.json({ message: 'If an account exists, a password reset email has been sent.' });
    }
    
    // Generate reset token
    const resetToken = generateRandomToken();
    const resetTokenHash = hashToken(resetToken);
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Update user
    await supabase
      .from('users')
      .update({
        reset_token: resetTokenHash,
        reset_token_expires: resetTokenExpires.toISOString()
      })
      .eq('id', user.id);
    
    // Send reset email
    await sendPasswordResetEmail(email, resetToken);
    
    res.json({ message: 'If an account exists, a password reset email has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      code: 'FORGOT_PASSWORD_FAILED'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: passwordValidation.errors.join(', '),
        code: 'WEAK_PASSWORD'
      });
    }
    
    const tokenHash = hashToken(token);
    
    // Find user with this token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', tokenHash)
      .single();
    
    if (error || !user) {
      return res.status(400).json({ 
        error: 'Invalid reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check if token expired
    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ 
        error: 'Reset token has expired. Please request a new one.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update user
    await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('id', user.id);
    
    // Invalidate all sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', user.id);
    
    res.json({ 
      message: 'Password reset successfully. Please log in with your new password.',
      success: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      code: 'RESET_PASSWORD_FAILED'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.substring(7);
    const tokenHash = hashToken(token);
    
    // Delete session
    await supabase
      .from('sessions')
      .delete()
      .eq('token_hash', tokenHash);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name
    }
  });
});

/**
 * DELETE /api/auth/account
 * Delete user account (requires authentication)
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all user sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);
    
    // Delete all user files from database (storage will be cleaned up by cascade)
    await supabase
      .from('files')
      .delete()
      .eq('user_id', userId);
    
    // Delete user account
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      code: 'DELETE_ACCOUNT_FAILED'
    });
  }
});

console.log('✅ Authentication routes initialized');

export default router;

// Made with Bob
