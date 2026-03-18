/**
 * Auth & User Management API Test Script
 *
 * Tests all endpoints:
 *   POST /api/auth/login
 *   POST /api/auth/refresh
 *   POST /api/auth/logout
 *   GET    /api/users
 *   POST   /api/users
 *   GET    /api/users/:id
 *   PATCH  /api/users/:id
 *   DELETE /api/users/:id
 *
 * Usage: node tests/auth-test/auth-test.js [BASE_URL]
 * Default BASE_URL: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function log(status, name, detail) {
  const icon = status === 'PASS' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
  results.push({ status, name, detail });
}

// Helper to make requests with cookie handling
let savedCookies = '';

async function req(method, path, { body, token, expectStatus, cookies } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (cookies || savedCookies) headers['Cookie'] = cookies || savedCookies;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);

  // Extract set-cookie header
  const setCookie = res.headers.get('set-cookie') || '';
  if (setCookie) savedCookies = setCookie.split(';')[0]; // Store raw cookie

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }

  if (expectStatus && res.status !== expectStatus) {
    throw new Error(`Expected ${expectStatus}, got ${res.status}: ${text.slice(0, 200)}`);
  }

  return { status: res.status, json, setCookie, headers: res.headers };
}

// ==================== AUTH TESTS ====================

async function testLoginSuccess() {
  const { status, json, setCookie } = await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });

  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.accessToken) throw new Error('No accessToken in response');
  if (!json.user) throw new Error('No user in response');
  if (json.user.role !== 'admin') throw new Error(`Expected role admin, got ${json.user.role}`);
  if (json.user.passwordHash) throw new Error('passwordHash leaked in response');
  if (!setCookie.includes('refreshToken')) throw new Error('No refreshToken cookie set');

  return json;
}

async function testLoginWrongPassword() {
  const { status, json } = await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'wrongpassword' },
  });

  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

async function testLoginWrongEmail() {
  const { status } = await req('POST', '/api/auth/login', {
    body: { email: 'nobody@formel.school', password: 'admin123' },
  });

  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

async function testLoginMissingFields() {
  const { status } = await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school' },
  });

  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
}

async function testRefreshToken() {
  // First login to get a refresh token cookie
  await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });

  // Now refresh using the cookie
  const { status, json, setCookie } = await req('POST', '/api/auth/refresh');

  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.accessToken) throw new Error('No new accessToken');
  if (!setCookie.includes('refreshToken')) throw new Error('No rotated refreshToken cookie');

  return json;
}

async function testRefreshTokenRotation() {
  // Login
  await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });

  const oldCookie = savedCookies;

  // Refresh once
  await req('POST', '/api/auth/refresh');
  const newCookie = savedCookies;

  if (oldCookie === newCookie) throw new Error('Cookie not rotated');

  // Try to use the old cookie (should fail — token was revoked)
  const { status } = await req('POST', '/api/auth/refresh', { cookies: oldCookie });

  if (status !== 401) throw new Error(`Old token should be revoked, got ${status}`);
}

async function testRefreshWithoutCookie() {
  const oldCookies = savedCookies;
  savedCookies = ''; // Clear cookies

  const { status } = await req('POST', '/api/auth/refresh');

  savedCookies = oldCookies; // Restore
  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

async function testLogout() {
  // Login first
  await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });
  const accessToken = (await req('POST', '/api/auth/refresh')).json.accessToken;

  // Logout
  const { status, json } = await req('POST', '/api/auth/logout', { token: accessToken });

  if (status !== 200) throw new Error(`Status ${status}`);

  // Refresh should now fail (token revoked)
  const { status: refreshStatus } = await req('POST', '/api/auth/refresh');
  if (refreshStatus !== 401) throw new Error(`Refresh after logout should fail, got ${refreshStatus}`);
}

async function testLogoutWithoutAuth() {
  savedCookies = '';
  const { status } = await req('POST', '/api/auth/logout');

  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

// ==================== USER MANAGEMENT TESTS ====================

let adminToken = '';
let createdUserId = '';
let secretaryToken = '';

async function testProtectedWithoutToken() {
  const { status } = await req('GET', '/api/users');
  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

async function testListUsers() {
  const { status, json } = await req('GET', '/api/users', { token: adminToken });

  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data array');
  if (!json.pagination) throw new Error('No pagination');
  if (!Array.isArray(json.data)) throw new Error('data is not array');
  // Ensure no passwordHash in any user
  for (const u of json.data) {
    if (u.passwordHash) throw new Error('passwordHash leaked');
  }
}

async function testCreateUser() {
  const { status, json } = await req('POST', '/api/users', {
    token: adminToken,
    body: {
      name: 'Test Secretary',
      email: 'test.secretary@formel.school',
      password: 'testsec123',
      role: 'secretary',
    },
  });

  if (status !== 201) throw new Error(`Status ${status}`);
  if (!json.id) throw new Error('No id returned');
  if (json.role !== 'secretary') throw new Error(`Role ${json.role}`);
  if (json.passwordHash) throw new Error('passwordHash leaked');

  createdUserId = json.id;
  return json;
}

async function testCreateUserDuplicateEmail() {
  const { status } = await req('POST', '/api/users', {
    token: adminToken,
    body: {
      name: 'Duplicate',
      email: 'test.secretary@formel.school',
      password: 'testsec123',
      role: 'secretary',
    },
  });

  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testCreateAdminRole() {
  const { status } = await req('POST', '/api/users', {
    token: adminToken,
    body: {
      name: 'Rogue Admin',
      email: 'rogue@formel.school',
      password: 'rogue123',
      role: 'admin',
    },
  });

  // Validation should reject 'admin' role
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
}

async function testGetUser() {
  const { status, json } = await req('GET', `/api/users/${createdUserId}`, { token: adminToken });

  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.id !== createdUserId) throw new Error('Wrong user');
  if (json.passwordHash) throw new Error('passwordHash leaked');
}

async function testGetUserNotFound() {
  const { status } = await req('GET', '/api/users/00000000-0000-0000-0000-000000000000', { token: adminToken });

  if (status !== 404) throw new Error(`Expected 404, got ${status}`);
}

async function testUpdateUser() {
  const { status, json } = await req('PATCH', `/api/users/${createdUserId}`, {
    token: adminToken,
    body: { name: 'Updated Secretary' },
  });

  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.name !== 'Updated Secretary') throw new Error(`Name not updated: ${json.name}`);
}

async function testSecretaryCannotAccessUsers() {
  // Login as the created secretary
  savedCookies = '';
  const loginRes = await req('POST', '/api/auth/login', {
    body: { email: 'test.secretary@formel.school', password: 'testsec123' },
  });
  secretaryToken = loginRes.json.accessToken;

  // Try to list users
  const { status } = await req('GET', '/api/users', { token: secretaryToken });
  if (status !== 403) throw new Error(`Expected 403, got ${status}`);
}

async function testSecretaryCanAccessStudents() {
  const { status } = await req('GET', '/api/students', { token: secretaryToken });
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
}

async function testDeactivateUser() {
  const { status, json } = await req('DELETE', `/api/users/${createdUserId}`, { token: adminToken });

  if (status !== 200) throw new Error(`Status ${status}`);
}

async function testDeactivatedUserCannotLogin() {
  const { status } = await req('POST', '/api/auth/login', {
    body: { email: 'test.secretary@formel.school', password: 'testsec123' },
  });

  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

async function testDeactivatedUserTokenRejected() {
  // The old secretary token should be rejected
  const { status } = await req('GET', '/api/students', { token: secretaryToken });
  if (status !== 401) throw new Error(`Expected 401, got ${status}`);
}

// ==================== RUNNER ====================

async function runTest(name, fn) {
  try {
    await fn();
    log('PASS', name);
  } catch (err) {
    log('FAIL', name, err.message);
  }
}

async function main() {
  console.log(`\n\x1b[1mAuth & User Management API Tests\x1b[0m`);
  console.log(`Target: ${BASE_URL}\n`);

  // --- Auth Tests ---
  console.log('\x1b[36m── Auth Endpoints ──\x1b[0m');

  await runTest('POST /login — valid credentials', testLoginSuccess);
  await runTest('POST /login — wrong password', testLoginWrongPassword);
  await runTest('POST /login — wrong email', testLoginWrongEmail);
  await runTest('POST /login — missing fields', testLoginMissingFields);
  await runTest('POST /refresh — valid refresh', testRefreshToken);
  await runTest('POST /refresh — token rotation (old token revoked)', testRefreshTokenRotation);
  await runTest('POST /refresh — no cookie', testRefreshWithoutCookie);
  await runTest('POST /logout — success + token revoked', testLogout);
  await runTest('POST /logout — without auth token', testLogoutWithoutAuth);

  // --- Get admin token for user tests ---
  savedCookies = '';
  const loginRes = await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });
  adminToken = loginRes.json.accessToken;

  // --- User Management Tests ---
  console.log('\n\x1b[36m── User Management Endpoints ──\x1b[0m');

  await runTest('GET /users — without auth token', testProtectedWithoutToken);
  await runTest('GET /users — list users', testListUsers);
  await runTest('POST /users — create secretary', testCreateUser);
  await runTest('POST /users — duplicate email', testCreateUserDuplicateEmail);
  await runTest('POST /users — cannot create admin role', testCreateAdminRole);
  await runTest('GET /users/:id — get user', testGetUser);
  await runTest('GET /users/:id — not found', testGetUserNotFound);
  await runTest('PATCH /users/:id — update user', testUpdateUser);

  // --- Role-based access ---
  console.log('\n\x1b[36m── Role-Based Access ──\x1b[0m');

  await runTest('Secretary — cannot access /api/users', testSecretaryCannotAccessUsers);
  await runTest('Secretary — can access /api/students', testSecretaryCanAccessStudents);

  // --- Deactivation ---
  console.log('\n\x1b[36m── User Deactivation ──\x1b[0m');

  await runTest('DELETE /users/:id — deactivate user', testDeactivateUser);
  await runTest('Deactivated user — cannot login', testDeactivatedUserCannotLogin);
  await runTest('Deactivated user — old token rejected', testDeactivatedUserTokenRejected);

  // --- Summary ---
  console.log(`\n\x1b[1m── Summary ──\x1b[0m`);
  console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, ${passed + failed} total\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nTest runner error:', err);
  process.exit(1);
});
