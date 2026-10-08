import { describe, expect, it } from 'vitest';
import { authLinkError } from '../lib/authLink.ts';

describe('email link errors', () => {
  it('recognises expired or used links', () => {
    expect(authLinkError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toBe('expired');
  });
  it('recognises other failures', () => {
    expect(authLinkError('#error=server_error&error_description=x')).toBe('failed');
  });
  it('ignores normal fragments, including a successful sign-in and share links', () => {
    expect(authLinkError('#access_token=abc&type=signup')).toBe(null);
    expect(authLinkError('#/vault/xyz')).toBe(null);
    expect(authLinkError('')).toBe(null);
  });
});
