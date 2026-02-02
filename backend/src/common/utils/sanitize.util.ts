/**
 * XSS Sanitization Utility
 * Strips potentially dangerous HTML and escapes special characters
 */

/**
 * Sanitizes input string to prevent XSS attacks
 * @param input - The string to sanitize
 * @returns Sanitized string with HTML tags stripped and special chars escaped
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input;
  
  // Remove script tags and their contents
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  
  // Escape HTML entities for remaining content
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * Light sanitization that allows safe HTML but removes dangerous elements
 * Useful for rich text content where some formatting is allowed
 */
export function sanitizeRichText(input: string): string {
  if (!input) return input;
  
  // Remove script tags and their contents
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: and data: URLs in href/src attributes
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  
  // Remove iframe, object, embed, form, and input tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input)[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/(iframe|object|embed|form|input)>/gi, '');
  
  return sanitized;
}
