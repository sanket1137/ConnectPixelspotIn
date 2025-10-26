import { Request, Response, NextFunction } from 'express';
import { sanitize } from '../security';

/**
 * Middleware to sanitize request body inputs
 * Prevents XSS attacks by cleaning user input
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  if (req.query) {
    sanitizeObject(req.query as any);
  }
  
  if (req.params) {
    sanitizeObject(req.params);
  }
  
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Sanitize string fields based on field name
        if (key.toLowerCase().includes('email')) {
          obj[key] = sanitize.email(value);
        } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          obj[key] = sanitize.phone(value);
        } else if (key.toLowerCase().includes('html') || key.toLowerCase().includes('description') || key.toLowerCase().includes('content')) {
          obj[key] = sanitize.html(value);
        } else {
          obj[key] = sanitize.text(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitizeObject(value);
      }
    }
  }
}

/**
 * Validate required authentication
 * Ensures user is authenticated before accessing protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

/**
 * Validate specific role access
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
}
