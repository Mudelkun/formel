const jwt = require('jsonwebtoken');

// Mock env before importing auth
jest.mock('../src/config/env', () => ({
  env: { JWT_SECRET: 'test-secret' },
}));

const { auth } = require('../src/middleware/auth');
const { authorize } = require('../src/middleware/authorize');
const { validate } = require('../src/middleware/validate');
const { z } = require('zod');

describe('auth middleware', () => {
  const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const mockNext = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should reject request without Authorization header', () => {
    const req = { headers: {} };
    expect(() => auth(req, mockRes(), mockNext)).toThrow('Authentication required');
  });

  test('should reject request with invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    expect(() => auth(req, mockRes(), mockNext)).toThrow('Invalid or expired token');
  });

  test('should attach user to request with valid token', () => {
    const token = jwt.sign({ userId: '123', role: 'admin' }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    auth(req, mockRes(), mockNext);
    expect(req.user).toEqual({ userId: '123', role: 'admin' });
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('authorize middleware', () => {
  const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const mockNext = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should allow authorized role', () => {
    const req = { user: { role: 'admin' } };
    const middleware = authorize('admin', 'staff');
    middleware(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should reject unauthorized role', () => {
    const req = { user: { role: 'teacher' } };
    const middleware = authorize('admin', 'staff');
    expect(() => middleware(req, mockRes(), mockNext)).toThrow('Insufficient permissions');
  });

  test('should reject when no user on request', () => {
    const req = {};
    const middleware = authorize('admin');
    expect(() => middleware(req, mockRes(), mockNext)).toThrow('Insufficient permissions');
  });
});

describe('validate middleware', () => {
  const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  const mockNext = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should pass with valid data', () => {
    const schema = z.object({
      body: z.object({ name: z.string().min(1) }),
    });
    const req = { body: { name: 'John' }, query: {}, params: {} };
    validate(schema)(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(req.body.name).toBe('John');
  });

  test('should reject with invalid data', () => {
    const schema = z.object({
      body: z.object({ name: z.string().min(1) }),
    });
    const req = { body: { name: '' }, query: {}, params: {} };
    expect(() => validate(schema)(req, mockRes(), mockNext)).toThrow('Validation failed');
  });
});
