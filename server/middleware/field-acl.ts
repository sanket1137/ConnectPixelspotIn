/**
 * Field-Level Access Control Middleware
 * 
 * Filters sensitive fields from API responses based on user role and access scope.
 * Implements principle of least privilege - only return data the user is authorized to see.
 */

export interface FieldACLConfig {
  role: string;
  userId?: string;
}

/**
 * List of sensitive fields that should be redacted for unauthorized users
 */
const SENSITIVE_FIELDS = [
  'firebaseUid',
  'phone',
  'mobileNumber',
  'gstNumber',
  'address',
  // Owner contact info - only visible to admins and the owner themselves
  'ownerPhone',
  'ownerEmail',
  'ownerContact',
];

/**
 * Filter sensitive fields from a single object based on access control rules
 */
export function filterSensitiveFields<T extends Record<string, any>>(
  data: T,
  config: FieldACLConfig
): Partial<T> {
  const { role, userId } = config;
  
  // Admins have full access
  if (role === 'admin') {
    return data;
  }
  
  const filtered = { ...data };
  
  // For screen owners: allow access to their own data
  if (role === 'screen_owner' && userId && data.ownerId === userId) {
    return filtered;
  }
  
  // For advertisers: remove all owner contact information
  SENSITIVE_FIELDS.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });
  
  // Additional redaction for user objects
  if ('email' in filtered && data.id !== userId) {
    // Only show email if it's the user's own data
    delete filtered.email;
  }
  
  return filtered;
}

/**
 * Filter sensitive fields from an array of objects
 */
export function filterSensitiveFieldsArray<T extends Record<string, any>>(
  dataArray: T[],
  config: FieldACLConfig
): Partial<T>[] {
  return dataArray.map(item => filterSensitiveFields(item, config));
}

/**
 * Express middleware to automatically filter sensitive fields from response
 */
export function aclMiddleware(req: any, res: any, next: any) {
  const originalJson = res.json.bind(res);
  
  res.json = function (data: any) {
    if (!req.user) {
      return originalJson(data);
    }
    
    const config: FieldACLConfig = {
      role: req.user.role,
      userId: req.user.id,
    };
    
    // Filter single object
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check if it's a response wrapper with nested data
      if (data.screens && Array.isArray(data.screens)) {
        data.screens = filterSensitiveFieldsArray(data.screens, config);
      } else if (data.users && Array.isArray(data.users)) {
        data.users = filterSensitiveFieldsArray(data.users, config);
      } else {
        data = filterSensitiveFields(data, config);
      }
    }
    
    // Filter array of objects
    if (Array.isArray(data)) {
      data = filterSensitiveFieldsArray(data, config);
    }
    
    return originalJson(data);
  };
  
  next();
}
