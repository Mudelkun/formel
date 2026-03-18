const { asyncHandler } = require('../../lib/asyncHandler');
const { AppError } = require('../../lib/apiError');
const authService = require('./auth.service');
const { env } = require('../../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

function refreshCookieOptions() {
  return {
    ...COOKIE_OPTIONS,
    maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken, user } = await authService.login(email, password);

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

module.exports = { login, refresh, logout };
