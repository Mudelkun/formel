const { asyncHandler } = require('../../lib/asyncHandler');
const { AppError } = require('../../lib/apiError');
const authService = require('./auth.service');
const { env } = require('../../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development',
  sameSite: 'strict',
  path: '/api/auth',
};

function refreshCookieOptions() {
  return {
    ...COOKIE_OPTIONS,
    maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
}

function extractDeviceInfo(req) {
  const raw =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'Unknown';

  // Normalize IPv6 loopback to a readable form
  const ip = raw === '::1' || raw === '::ffff:127.0.0.1' ? '127.0.0.1 (local)' : raw;

  return {
    userAgent: req.headers['user-agent'] || 'Unknown',
    ip,
  };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const deviceInfo = extractDeviceInfo(req);

  const result = await authService.login(email, password, deviceInfo);

  if (result.requiresVerification) {
    return res.json({ requiresVerification: true, sessionToken: result.sessionToken });
  }

  const { accessToken, refreshToken, user } = result;
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  res.json({ accessToken, user });
});

const verifyDevice = asyncHandler(async (req, res) => {
  const { sessionToken, code } = req.body;
  const deviceInfo = extractDeviceInfo(req);

  const { accessToken, refreshToken, user } = await authService.verifyDevice(sessionToken, code, deviceInfo);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  res.json({ accessToken, user });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) {
    throw new AppError(401, 'Refresh token required');
  }

  const { accessToken, refreshToken, user } = await authService.refresh(rawRefreshToken);

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  res.json({ accessToken, user });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (rawRefreshToken) {
    await authService.logout(rawRefreshToken);
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
});

module.exports = { login, verifyDevice, refresh, logout };
