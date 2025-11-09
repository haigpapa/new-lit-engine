/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Validation utilities for user input
 */

import type { ValidationResult } from '../types'

const MAX_QUERY_LENGTH = 500;
const MIN_QUERY_LENGTH = 1;

// Patterns that might indicate malicious input
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // Event handlers like onclick=
  /<iframe/i,
  /eval\(/i,
];

/**
 * Validates a search query
 */
export function validateSearchQuery(query: any): ValidationResult {
  // Check if query exists
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }

  // Trim whitespace
  const trimmed = query.trim();

  // Check length
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { valid: false, error: 'Query is too short' };
  }

  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query is too long (max ${MAX_QUERY_LENGTH} characters)` };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Query contains invalid characters' };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes user input by removing potentially dangerous content
 */
export function sanitizeInput(input: any): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Limit to printable characters and common punctuation
    .replace(/[^\w\s\-.,!?'":;()]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .substring(0, MAX_QUERY_LENGTH);
}

/**
 * Validates a node ID
 */
export function validateNodeId(nodeId: any): ValidationResult {
  if (!nodeId || typeof nodeId !== 'string') {
    return { valid: false, error: 'Node ID must be a non-empty string' };
  }

  // Node IDs should match pattern: "type:label"
  const nodeIdPattern = /^(book|author|theme):.+$/;

  if (!nodeIdPattern.test(nodeId)) {
    return { valid: false, error: 'Invalid node ID format' };
  }

  return { valid: true };
}

/**
 * Validates a year for timeline filtering
 */
export function validateYear(year: any): ValidationResult {
  const currentYear = new Date().getFullYear();
  const minYear = 1000; // Earliest reasonable publication year

  if (typeof year !== 'number' || isNaN(year)) {
    return { valid: false, error: 'Year must be a number' };
  }

  if (year < minYear || year > currentYear + 10) {
    return { valid: false, error: `Year must be between ${minYear} and ${currentYear + 10}` };
  }

  return { valid: true };
}
