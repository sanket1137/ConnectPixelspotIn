/**
 * PII Redaction Filter
 * 
 * Scans text for personally identifiable information patterns and redacts them.
 * Applied to AI-generated responses to prevent accidental PII leakage.
 */

// Pattern definitions for PII detection
const PII_PATTERNS = {
  // Indian mobile numbers: +91 followed by 10 digits, with optional spaces/dashes
  mobileNumber: /(\+91[\s-]?)?[6-9]\d{9}/g,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Common Indian address patterns (Pin codes)
  pincode: /\b\d{6}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // UUIDs (potential user IDs)
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  
  // Firebase UIDs (common pattern)
  firebaseUid: /\b[A-Za-z0-9]{28}\b/g,
};

export interface RedactionResult {
  redactedText: string;
  patternsFound: string[];
  redactionCount: number;
}

/**
 * Redact PII from text content
 */
export function redactPII(text: string): RedactionResult {
  let redactedText = text;
  const patternsFound: string[] = [];
  let redactionCount = 0;
  
  // Redact mobile numbers
  if (PII_PATTERNS.mobileNumber.test(text)) {
    patternsFound.push('mobile_number');
    redactedText = redactedText.replace(PII_PATTERNS.mobileNumber, '[PHONE REDACTED]');
    redactionCount++;
  }
  
  // Redact email addresses
  if (PII_PATTERNS.email.test(text)) {
    patternsFound.push('email');
    redactedText = redactedText.replace(PII_PATTERNS.email, '[EMAIL REDACTED]');
    redactionCount++;
  }
  
  // Redact pincodes (only if not part of larger number)
  if (PII_PATTERNS.pincode.test(text)) {
    patternsFound.push('pincode');
    // More conservative - only redact if it looks like an address context
    const pincodeMatches = text.match(PII_PATTERNS.pincode);
    if (pincodeMatches) {
      pincodeMatches.forEach(match => {
        // Check if surrounded by address-like context
        const context = text.toLowerCase();
        if (
          context.includes('address') ||
          context.includes('location') ||
          context.includes('pincode') ||
          context.includes('pin code')
        ) {
          redactedText = redactedText.replace(match, '[PINCODE REDACTED]');
          redactionCount++;
        }
      });
    }
  }
  
  // Redact credit card numbers
  if (PII_PATTERNS.creditCard.test(text)) {
    patternsFound.push('credit_card');
    redactedText = redactedText.replace(PII_PATTERNS.creditCard, '[CARD REDACTED]');
    redactionCount++;
  }
  
  // Redact UUIDs (potential database IDs)
  if (PII_PATTERNS.uuid.test(text)) {
    patternsFound.push('uuid');
    redactedText = redactedText.replace(PII_PATTERNS.uuid, '[ID REDACTED]');
    redactionCount++;
  }
  
  // Redact Firebase UIDs
  if (PII_PATTERNS.firebaseUid.test(text)) {
    patternsFound.push('firebase_uid');
    redactedText = redactedText.replace(PII_PATTERNS.firebaseUid, '[UID REDACTED]');
    redactionCount++;
  }
  
  return {
    redactedText,
    patternsFound: Array.from(new Set(patternsFound)),
    redactionCount,
  };
}

/**
 * Check if text contains any PII patterns
 */
export function containsPII(text: string): boolean {
  return Object.values(PII_PATTERNS).some(pattern => pattern.test(text));
}

/**
 * Redact PII from AI message response
 */
export function redactAIResponse(message: string): {
  message: string;
  wasRedacted: boolean;
  patternsFound: string[];
} {
  const result = redactPII(message);
  
  return {
    message: result.redactedText,
    wasRedacted: result.redactionCount > 0,
    patternsFound: result.patternsFound,
  };
}
