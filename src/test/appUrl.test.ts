import { describe, it, expect } from 'vitest';
import {
  getAuthRedirectUrl,
  getPublicAppOrigin,
  isLocalhostOrigin,
  normalizeAppOrigin,
} from '@/lib/appUrl';

describe('normalizeAppOrigin', () => {
  it('strips trailing slashes', () => {
    expect(normalizeAppOrigin('https://heirway.vercel.app/')).toBe('https://heirway.vercel.app');
    expect(normalizeAppOrigin('https://heirway.vercel.app///')).toBe('https://heirway.vercel.app');
  });
});

describe('isLocalhostOrigin', () => {
  it('detects localhost and 127.0.0.1', () => {
    expect(isLocalhostOrigin('http://localhost:8080')).toBe(true);
    expect(isLocalhostOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isLocalhostOrigin('https://heirway.vercel.app')).toBe(false);
  });
});

describe('getPublicAppOrigin', () => {
  it('1. production browser origin → vercel', () => {
    expect(
      getPublicAppOrigin({
        browserOrigin: 'https://heirway.vercel.app',
        isProduction: true,
      }),
    ).toBe('https://heirway.vercel.app');
  });

  it('2. localhost:8080 → local origin', () => {
    expect(
      getPublicAppOrigin({
        browserOrigin: 'http://localhost:8080',
        isProduction: false,
      }),
    ).toBe('http://localhost:8080');
  });

  it('3. explicit configured production URL wins', () => {
    expect(
      getPublicAppOrigin({
        configuredUrl: 'https://heirway.vercel.app/',
        browserOrigin: 'http://localhost:8080',
        isProduction: true,
      }),
    ).toBe('https://heirway.vercel.app');
  });

  it('4. no accidental localhost:3000 production fallback', () => {
    expect(() =>
      getPublicAppOrigin({
        configuredUrl: 'http://localhost:3000',
        browserOrigin: null,
        isProduction: true,
      }),
    ).toThrow(/not configured/i);

    expect(
      getPublicAppOrigin({
        configuredUrl: 'http://localhost:3000',
        browserOrigin: 'https://heirway.vercel.app',
        isProduction: true,
      }),
    ).toBe('https://heirway.vercel.app');
  });
});

describe('getAuthRedirectUrl', () => {
  it('5. trailing slash normalization on origin', () => {
    expect(
      getAuthRedirectUrl('/reset-password', {
        configuredUrl: 'https://heirway.vercel.app/',
        isProduction: true,
      }),
    ).toBe('https://heirway.vercel.app/reset-password');
  });

  it('6. reset route composed correctly', () => {
    expect(
      getAuthRedirectUrl('/reset-password', {
        browserOrigin: 'https://heirway.vercel.app',
        isProduction: true,
      }),
    ).toBe('https://heirway.vercel.app/reset-password');
  });

  it('7. signup/confirmation redirect composed correctly', () => {
    expect(
      getAuthRedirectUrl('/set-password', {
        browserOrigin: 'http://localhost:8080',
        isProduction: false,
      }),
    ).toBe('http://localhost:8080/set-password');
  });
});
