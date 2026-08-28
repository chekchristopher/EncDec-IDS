import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  loginSchema, 
  signupSchema, 
  hostRegisterSchema, 
  ruleCreateSchema, 
  mssqlQuerySchema,
  mssqlConfigureSchema
} from '../../schemas/validation.js';

describe('API Input Validation Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'operator@coou.edu.ng',
        password: 'SecurePassword123!'
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email formats', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123'
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@coou.edu.ng',
        password: ''
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('validates correct operator signup data', () => {
      const result = signupSchema.safeParse({
        name: 'Alex SecOps',
        email: 'alex@coou.edu.ng',
        password: 'StrongPassword2026',
        role: 'analyst'
      });
      expect(result.success).toBe(true);
    });

    it('rejects short passwords', () => {
      const result = signupSchema.safeParse({
        name: 'Alex',
        email: 'alex@coou.edu.ng',
        password: '123',
        role: 'analyst'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ruleCreateSchema', () => {
    it('accepts a valid Snort/Suricata style rule', () => {
      const result = ruleCreateSchema.safeParse({
        name: 'Detect SQLi on Portal',
        type: 'signature',
        target: 'network',
        severity: 'critical',
        definition: '{"pattern": "UNION SELECT"}',
        mitreMapping: 'T1190'
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid severity level', () => {
      const result = ruleCreateSchema.safeParse({
        name: 'Invalid Rule',
        type: 'signature',
        target: 'network',
        severity: 'super-urgent',
        definition: 'test'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mssqlQuerySchema', () => {
    it('accepts non-empty SQL query string', () => {
      const result = mssqlQuerySchema.safeParse({
        query: 'SELECT * FROM dbo.EncDec_SecurityAlerts'
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty query string', () => {
      const result = mssqlQuerySchema.safeParse({
        query: ''
      });
      expect(result.success).toBe(false);
    });
  });
});
