import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage, createErrorResponse } from '../src/utils/errors';

describe('sanitizeErrorMessage', () => {
  it('passes through safe error messages', () => {
    expect(sanitizeErrorMessage('Video not found: abc123')).toBe('Video not found: abc123');
    expect(sanitizeErrorMessage('Channel not found: xyz')).toBe('Channel not found: xyz');
    expect(sanitizeErrorMessage('Request timed out')).toBe('Request timed out');
    expect(sanitizeErrorMessage('Input too long')).toBe('Input too long');
  });

  it('blocks messages containing API key patterns', () => {
    expect(sanitizeErrorMessage('Invalid api_key: AIzaSy...')).toBe(
      'An error occurred while processing your request'
    );
    expect(sanitizeErrorMessage('Missing apiKey in config')).toBe(
      'An error occurred while processing your request'
    );
  });

  it('blocks messages containing token patterns', () => {
    expect(sanitizeErrorMessage('Token expired: eyJhbGc...')).toBe(
      'An error occurred while processing your request'
    );
    expect(sanitizeErrorMessage('Invalid bearer token')).toBe(
      'An error occurred while processing your request'
    );
  });

  it('blocks messages containing password/secret patterns', () => {
    expect(sanitizeErrorMessage('Wrong password provided')).toBe(
      'An error occurred while processing your request'
    );
    expect(sanitizeErrorMessage('Secret key mismatch')).toBe(
      'An error occurred while processing your request'
    );
  });

  it('blocks messages referencing config files', () => {
    expect(sanitizeErrorMessage('Error reading .env file')).toBe(
      'An error occurred while processing your request'
    );
    expect(sanitizeErrorMessage('config.json not found')).toBe(
      'An error occurred while processing your request'
    );
  });

  it('truncates long error messages', () => {
    const longMessage = 'a'.repeat(600);
    const result = sanitizeErrorMessage(longMessage);
    expect(result.length).toBe(503); // 500 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('removes stack traces', () => {
    const errorWithStack = 'Something failed\n    at Function.doSomething (/path/to/file.js:10:5)';
    expect(sanitizeErrorMessage(errorWithStack)).toBe('Something failed');
  });

  it('handles Error objects', () => {
    const error = new Error('Video not found: test123');
    expect(sanitizeErrorMessage(error)).toBe('Video not found: test123');
  });

  it('handles non-Error objects', () => {
    expect(sanitizeErrorMessage('plain string error')).toBe('plain string error');
    expect(sanitizeErrorMessage(42)).toBe('42');
    expect(sanitizeErrorMessage({ message: 'obj' })).toBe('[object Object]');
  });
});

describe('createErrorResponse', () => {
  it('creates properly formatted error response', () => {
    const response = createErrorResponse('Video not found: abc');
    expect(response.isError).toBe(true);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBe('Error: Video not found: abc');
  });

  it('sanitizes error before creating response', () => {
    const response = createErrorResponse('Missing api_key');
    expect(response.content[0].text).toBe('Error: An error occurred while processing your request');
  });
});
