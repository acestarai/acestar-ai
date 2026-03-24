import { verifyToken } from './jwt.js';
import { supabase } from './supabase.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * Requires valid token and verified email
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, email_verified')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please check your email for verification link.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 * Useful for routes that work with or without authentication
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        const { data: user } = await supabase
          .from('users')
          .select('id, email, full_name, email_verified')
          .eq('id', decoded.userId)
          .single();
        
        if (user && user.email_verified) {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

console.log('✅ Authentication middleware initialized');

// Made with Bob
