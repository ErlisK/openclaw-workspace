/**
 * lib/__tests__/jurisdiction.test.ts
 * Unit tests for jurisdiction geofencing logic.
 * Run with: npx jest lib/__tests__/jurisdiction.test.ts
 */

import {
  isV1Supported,
  getJurisdictionWarning,
  resolveJurisdiction,
  V1_JURISDICTIONS,
} from '../jurisdiction';

describe('isV1Supported', () => {
  test('US is supported', () => expect(isV1Supported('US')).toBe(true));
  test('UK is supported', () => expect(isV1Supported('UK')).toBe(true));
  test('CA is not supported', () => expect(isV1Supported('CA')).toBe(false));
  test('DE is not supported', () => expect(isV1Supported('DE')).toBe(false));
  test('OTHER is not supported', () => expect(isV1Supported('OTHER')).toBe(false));
  test('empty string is not supported', () => expect(isV1Supported('')).toBe(false));
});

describe('getJurisdictionWarning', () => {
  test('US returns null (no warning)', () => expect(getJurisdictionWarning('US')).toBeNull());
  test('UK returns null (no warning)', () => expect(getJurisdictionWarning('UK')).toBeNull());
  test('CA returns a warning string', () => {
    const w = getJurisdictionWarning('CA');
    expect(w).toBeTruthy();
    expect(typeof w).toBe('string');
    expect(w!.length).toBeGreaterThan(20);
  });
  test('DE returns EU-specific warning', () => {
    const w = getJurisdictionWarning('DE');
    expect(w).toContain('GDPR');
  });
  test('unknown code returns fallback warning', () => {
    const w = getJurisdictionWarning('ZZ');
    expect(w).toBeTruthy();
  });
});

describe('resolveJurisdiction', () => {
  test('null input defaults to US', () => {
    const r = resolveJurisdiction(null);
    expect(r.code).toBe('US');
    expect(r.supported).toBe(true);
    expect(r.warning).toBeNull();
  });
  test('undefined input defaults to US', () => {
    expect(resolveJurisdiction(undefined).code).toBe('US');
  });
  test('GB alias resolves to UK', () => {
    const r = resolveJurisdiction('GB');
    expect(r.code).toBe('UK');
    expect(r.supported).toBe(true);
  });
  test('en-gb alias resolves to UK (case-insensitive)', () => {
    expect(resolveJurisdiction('en-gb').code).toBe('UK');
  });
  test('CA resolves correctly with warning', () => {
    const r = resolveJurisdiction('CA');
    expect(r.code).toBe('CA');
    expect(r.supported).toBe(false);
    expect(r.warning).toBeTruthy();
  });
  test('US is supported with no warning', () => {
    const r = resolveJurisdiction('US');
    expect(r.supported).toBe(true);
    expect(r.warning).toBeNull();
  });
  test('V1_JURISDICTIONS contains exactly US and UK', () => {
    expect([...V1_JURISDICTIONS].sort()).toEqual(['UK', 'US']);
  });
});
