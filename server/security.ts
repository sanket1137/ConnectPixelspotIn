import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import type { Express } from 'express';

/**
 * Comprehensive Security Configuration for Pixelspot
 * 
 * Implements:
 * 1. CORS: Configured origins only
 * 2. Security Headers: HSTS, X-Frame-Options, CSP, etc.
 * 3. Rate Limiting: DDoS protection
 * 4. HPP: HTTP Parameter Pollution prevention
 * 5. XSS Protection: Content Security Policy
 */

export function setupSecurity(app: Express) {
  // 1. CORS Configuration - Restrict to specific origins
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  // Extract base domain ID for both .replit.dev and .repl.co
  const replitDomains: string[] = [];
  if (replitDevDomain) {
    replitDomains.push(`https://${replitDevDomain}`);
    // Also allow .repl.co variant
    const replCoVariant = replitDevDomain.replace('.replit.dev', '.repl.co');
    if (replCoVariant !== replitDevDomain) {
      replitDomains.push(`https://${replCoVariant}`);
    }
  }
  
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://pixelspot.in',
        'https://www.pixelspot.in',
        'https://connect.pixelspot.in',
        'https://adsmanager.pixelspot.in',
        ...replitDomains,
      ].filter(Boolean)
    : [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        ...replitDomains,
      ].filter(Boolean);

  console.log('🔧 CORS Configuration:', { 
    NODE_ENV: process.env.NODE_ENV, 
    allowedOrigins 
  });

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
        console.warn(`   Allowed origins:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  }));

  // 2. Security Headers with Helmet
  app.use(helmet({
    // HSTS - Force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options - Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Vite in development
          "'unsafe-eval'", // Required for Vite in development
          "https://maps.googleapis.com",
          "https://www.gstatic.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://firebaseinstallations.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://*.firebaseio.com",
          process.env.REPLIT_DEV_DOMAIN ? `wss://${process.env.REPLIT_DEV_DOMAIN}` : '',
        ].filter(Boolean),
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    // X-Content-Type-Options
    noSniff: true,
    // X-XSS-Protection (legacy but still useful)
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
  }));

  // 3. Rate Limiting - Prevent brute force and DDoS
  
  // General API rate limit
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for static assets
    skip: (req) => !req.path.startsWith('/api'),
  });

  // Strict rate limit for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // OTP verification rate limit
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 OTP attempts per 15 minutes
    message: 'Too many OTP requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/verify-email-otp', otpLimiter);
  app.use('/api/auth/verify-mobile-otp', otpLimiter);
  app.use('/api/auth/send-email-otp', otpLimiter);
  app.use('/api/auth/send-mobile-otp', otpLimiter);

  // 4. HTTP Parameter Pollution Prevention
  app.use(hpp());

  console.log('✅ Security measures enabled:');
  console.log('  - CORS: Configured origins only');
  console.log('  - HSTS: Enabled (1 year)');
  console.log('  - X-Frame-Options: DENY');
  console.log('  - Content Security Policy: Configured');
  console.log('  - Rate Limiting: Active');
  console.log('  - HPP: HTTP Parameter Pollution Prevention');
  console.log('  - XSS Protection: Headers configured');
}

/**
 * Input Sanitization Utilities
 * Use these to sanitize user input and prevent XSS attacks
 */

export const sanitize = {
  // Sanitize HTML to prevent XSS
  html: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Sanitize for SQL-like queries (though we use parameterized queries)
  sql: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/['";\\]/g, '');
  },

  // Sanitize email
  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.toLowerCase().trim();
  },

  // Sanitize phone number
  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/[^\d+]/g, '');
  },

  // Sanitize general text input
  text: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 10000); // Max 10k characters
  },
};

/**
 * Validation utilities
 */
export const validate = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    // Indian phone number format: +91XXXXXXXXXX or 10 digits
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  mongoId: (id: string): boolean => {
    return /^[a-f\d]{24}$/i.test(id);
  },
};
