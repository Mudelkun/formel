const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { eq, and } = require('drizzle-orm');
const { db } = require('../../config/database');
const { users } = require('../../db/schema/users');
const { refreshTokens } = require('../../db/schema/refreshTokens');
const { verificationCodes } = require('../../db/schema/verificationCodes');
const { trustedDevices } = require('../../db/schema/trustedDevices');
const { env } = require('../../config/env');
const { AppError } = require('../../lib/apiError');

const ACCESS_TOKEN_EXPIRY = '15m';
const SESSION_TOKEN_EXPIRY = '10m';
const OTP_EXPIRY_MS = 10 * 60 * 1000;

function generateAccessToken(userId, role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function generateSessionToken(userId) {
  return jwt.sign({ userId, type: 'device_verification' }, env.JWT_SECRET, { expiresIn: SESSION_TOKEN_EXPIRY });
}

function verifySessionToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (payload.type !== 'device_verification') throw new Error('Invalid token type');
  return payload;
}

function computeDeviceFingerprint(userId, userAgent, ip) {
  return crypto.createHash('sha256').update(`${userId}:${userAgent}:${ip}`).digest('hex');
}

function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

async function issueTokens(userId, role) {
  const accessToken = generateAccessToken(userId, role);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

  return { accessToken, refreshToken: rawRefreshToken };
}

async function sendSecurityEmail(subject, html) {
  if (!env.RESEND_API_KEY) return;
  const { Resend } = require('resend');
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: env.SECURITY_ALERT_EMAIL,
    subject,
    html,
  });
}

function buildVerificationEmailHtml(userName, code) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Code de vérification</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="background:#1e3a8a;border-radius:10px 10px 0 0;padding:24px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#93c5fd;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Vérification de sécurité — Formel</p>
    </div>
    <div style="background:#ffffff;padding:32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 16px;font-size:15px;color:#111827;">Bonjour <strong>${userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.7;">
        Une tentative de connexion a été détectée depuis un nouvel appareil. Entrez le code ci-dessous pour confirmer votre identité.
      </p>
      <div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Votre code de vérification</p>
        <p style="margin:0;font-size:36px;font-weight:800;color:#1e3a8a;letter-spacing:8px;">${code}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Ce code expire dans <strong>10 minutes</strong>. Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email — votre compte reste sécurisé.
      </p>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:16px 28px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">Formel — Système de gestion scolaire &mdash; Ne répondez pas à cet email.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildNewDeviceAlertHtml(userName, userEmail, deviceInfo) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', dateStyle: 'full', timeStyle: 'short' });
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nouvel appareil approuvé</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="background:#166534;border-radius:10px 10px 0 0;padding:24px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#86efac;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Nouvel appareil approuvé — Formel</p>
    </div>
    <div style="background:#ffffff;padding:32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 16px;font-size:15px;color:#111827;">Un nouvel appareil a été vérifié et ajouté aux appareils de confiance.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;font-weight:600;width:40%;">Utilisateur</td>
          <td style="padding:10px 0;color:#111827;">${userName} (${userEmail})</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;font-weight:600;">Adresse IP</td>
          <td style="padding:10px 0;color:#111827;">${deviceInfo.ip}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;font-weight:600;">Navigateur / OS</td>
          <td style="padding:10px 0;color:#111827;word-break:break-all;">${deviceInfo.userAgent}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-weight:600;">Date et heure</td>
          <td style="padding:10px 0;color:#111827;">${date}</td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Si cette connexion ne vous est pas familière, déactivez immédiatement le compte concerné depuis le panneau d'administration.
      </p>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:16px 28px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">Formel — Système de gestion scolaire &mdash; Ne répondez pas à cet email.</p>
    </div>
  </div>
</body>
</html>`;
}

async function login(email, password, deviceInfo) {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) throw new AppError(401, 'Invalid email or password');
  if (!user.isActive) throw new AppError(401, 'Account deactivated');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const fingerprint = computeDeviceFingerprint(user.id, deviceInfo.userAgent, deviceInfo.ip);

  const [knownDevice] = await db
    .select()
    .from(trustedDevices)
    .where(and(
      eq(trustedDevices.userId, user.id),
      eq(trustedDevices.deviceFingerprint, fingerprint),
    ));

  if (!knownDevice) {
    // Unknown device — send OTP and return session token
    const otp = generateOTP();
    const codeHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Invalidate any previous unused codes for this user
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, user.id));
    await db.insert(verificationCodes).values({ userId: user.id, codeHash, expiresAt });

    await sendSecurityEmail(
      'Code de vérification — Formel',
      buildVerificationEmailHtml(user.name, otp),
    ).catch((err) => console.error('Failed to send verification email:', err));

    const sessionToken = generateSessionToken(user.id);
    return { requiresVerification: true, sessionToken };
  }

  // Known device — update lastSeenAt and issue tokens
  await db
    .update(trustedDevices)
    .set({ lastSeenAt: new Date() })
    .where(eq(knownDevice.id, knownDevice.id));

  const { accessToken, refreshToken } = await issueTokens(user.id, user.role);
  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

async function verifyDevice(sessionToken, code, deviceInfo) {
  let payload;
  try {
    payload = verifySessionToken(sessionToken);
  } catch {
    throw new AppError(401, 'Session expirée. Veuillez vous reconnecter.');
  }

  const { userId } = payload;
  const codeHash = hashToken(code);

  const [stored] = await db
    .select()
    .from(verificationCodes)
    .where(and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.codeHash, codeHash),
    ));

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Code invalide ou expiré.');
  }

  // Mark code as used
  await db.update(verificationCodes).set({ usedAt: new Date() }).where(eq(verificationCodes.id, stored.id));

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.isActive) throw new AppError(401, 'Account deactivated');

  // Store trusted device
  const fingerprint = computeDeviceFingerprint(userId, deviceInfo.userAgent, deviceInfo.ip);
  await db.insert(trustedDevices).values({
    userId,
    deviceFingerprint: fingerprint,
    userAgent: deviceInfo.userAgent,
    ipAddress: deviceInfo.ip,
  });

  // Send alert email (non-blocking)
  sendSecurityEmail(
    'Nouvel appareil approuvé — Formel',
    buildNewDeviceAlertHtml(user.name, user.email, deviceInfo),
  ).catch((err) => console.error('Failed to send device alert email:', err));

  const { accessToken, refreshToken } = await issueTokens(user.id, user.role);
  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

async function refresh(rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      eq(refreshTokens.revoked, false),
    ));

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId));

  if (!user || !user.isActive) {
    throw new AppError(401, 'Account deactivated');
  }

  // Revoke old token (rotation)
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, stored.id));

  const accessToken = generateAccessToken(user.id, user.role);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({ userId: user.id, tokenHash: newTokenHash, expiresAt });

  return { accessToken, refreshToken: newRawRefreshToken, user: sanitizeUser(user) };
}

async function logout(rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.tokenHash, tokenHash));
}

async function revokeAllUserTokens(userId) {
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId));
}

module.exports = { login, verifyDevice, refresh, logout, revokeAllUserTokens };
