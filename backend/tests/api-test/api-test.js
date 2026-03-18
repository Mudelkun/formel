/**
 * Full Backend API Test Script
 *
 * Tests all remaining endpoints (settings, school years, quarters, classes,
 * enrollments, scholarships, payments, payment documents, finance, audit logs).
 *
 * Usage: node tests/api-test/api-test.js [BASE_URL]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

let passed = 0;
let failed = 0;
let savedCookies = '';
let adminToken = '';

// Stored IDs for chaining
const ids = {};
const RUN_ID = Date.now(); // Unique per test run to avoid conflicts

function log(status, name, detail) {
  const icon = status === 'PASS' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
}

async function req(method, path, { body, token, cookies } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (cookies || savedCookies) headers['Cookie'] = cookies || savedCookies;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const setCookie = res.headers.get('set-cookie') || '';
  if (setCookie) savedCookies = setCookie.split(';')[0];

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

async function runTest(name, fn) {
  try {
    await fn();
    log('PASS', name);
  } catch (err) {
    log('FAIL', name, err.message);
  }
}

// ==================== SETTINGS ====================
async function testGetSettings() {
  const { status, json } = await req('GET', '/api/settings', { token: adminToken });
  // May be 200 (seed data) or 404 (no settings)
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
}

async function testUpdateSettings() {
  const { status, json } = await req('PATCH', '/api/settings', {
    token: adminToken,
    body: { schoolName: 'Test École Formel', phone: '+221 33 999 0000' },
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.schoolName !== 'Test École Formel') throw new Error('Name not updated');
}

async function testGetSettingsAfterUpdate() {
  const { status, json } = await req('GET', '/api/settings', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.schoolName !== 'Test École Formel') throw new Error('Settings not persisted');
}

// ==================== SCHOOL YEARS ====================
async function testListSchoolYears() {
  const { status, json } = await req('GET', '/api/school-years', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
  if (!json.pagination) throw new Error('No pagination');
}

async function testCreateSchoolYear() {
  const yearLabel = `TEST-${RUN_ID}`;
  ids.yearLabel = yearLabel;
  const { status, json } = await req('POST', '/api/school-years', {
    token: adminToken,
    body: { year: yearLabel, startDate: '2099-09-01', endDate: '2100-06-30' },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.schoolYearId = json.id;
}

async function testCreateDuplicateSchoolYear() {
  const { status } = await req('POST', '/api/school-years', {
    token: adminToken,
    body: { year: ids.yearLabel, startDate: '2099-09-01', endDate: '2100-06-30' },
  });
  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testGetSchoolYear() {
  const { status, json } = await req('GET', `/api/school-years/${ids.schoolYearId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.year !== ids.yearLabel) throw new Error('Wrong year');
}

async function testUpdateSchoolYear() {
  const { status, json } = await req('PATCH', `/api/school-years/${ids.schoolYearId}`, {
    token: adminToken,
    body: { endDate: '2027-07-15' },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

async function testActivateSchoolYear() {
  const { status, json } = await req('PATCH', `/api/school-years/${ids.schoolYearId}/activate`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.isActive !== true) throw new Error('Not activated');
}

// ==================== QUARTERS ====================
async function testCreateQuarters() {
  const quarterDates = [
    { startDate: '2099-09-01', endDate: '2099-11-30' },
    { startDate: '2099-12-01', endDate: '2100-02-28' },
    { startDate: '2100-03-01', endDate: '2100-06-30' },
  ];
  for (let i = 0; i < 3; i++) {
    const { status, json } = await req('POST', `/api/school-years/${ids.schoolYearId}/quarters`, {
      token: adminToken,
      body: {
        name: `Trimestre ${i + 1}`,
        number: i + 1,
        ...quarterDates[i],
      },
    });
    if (status !== 201) throw new Error(`Quarter ${i + 1}: status ${status}: ${JSON.stringify(json)}`);
    if (i === 0) ids.quarterId = json.id;
  }
}

async function testListQuarters() {
  const { status, json } = await req('GET', `/api/school-years/${ids.schoolYearId}/quarters`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data || json.data.length !== 3) throw new Error(`Expected 3 quarters, got ${json.data?.length}`);
}

async function testUpdateQuarter() {
  const { status } = await req('PATCH', `/api/quarters/${ids.quarterId}`, {
    token: adminToken,
    body: { name: 'Trimestre 1 (updated)' },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

// ==================== CLASSES ====================
async function testListClasses() {
  const { status, json } = await req('GET', '/api/classes', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
  // Store first class ID from seeded data
  if (json.data.length > 0) ids.classId = json.data[0].id;
}

async function testCreateClass() {
  // Use a random grade level to avoid conflicts on re-runs
  const gradeLevel = 900 + Math.floor(Math.random() * 100);
  const { status, json } = await req('POST', '/api/classes', {
    token: adminToken,
    body: { name: `Test Class ${gradeLevel}`, gradeLevel, annualTuitionFee: '300000' },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.newClassId = json.id;
}

async function testGetClass() {
  const { status, json } = await req('GET', `/api/classes/${ids.newClassId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.name.startsWith('Test Class')) throw new Error('Wrong name');
}

async function testUpdateClass() {
  const { status } = await req('PATCH', `/api/classes/${ids.newClassId}`, {
    token: adminToken,
    body: { annualTuitionFee: '350000' },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

// ==================== ENROLLMENTS ====================
async function testGetStudentForEnrollment() {
  // Get a student from the seeded data
  const { status, json } = await req('GET', '/api/students', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data || json.data.length === 0) throw new Error('No students');
  ids.studentId = json.data[0].id;
}

async function testCreateEnrollment() {
  const { status, json } = await req('POST', '/api/enrollments', {
    token: adminToken,
    body: {
      studentId: ids.studentId,
      classId: ids.classId || ids.newClassId,
      schoolYearId: ids.schoolYearId,
    },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.enrollmentId = json.id;
}

async function testDuplicateEnrollment() {
  const { status } = await req('POST', '/api/enrollments', {
    token: adminToken,
    body: {
      studentId: ids.studentId,
      classId: ids.classId || ids.newClassId,
      schoolYearId: ids.schoolYearId,
    },
  });
  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testListEnrollments() {
  const { status, json } = await req('GET', '/api/enrollments', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
}

async function testGetEnrollment() {
  const { status, json } = await req('GET', `/api/enrollments/${ids.enrollmentId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.studentFirstName) throw new Error('Missing joined student data');
}

// ==================== SCHOLARSHIPS ====================
async function testCreateScholarship() {
  const { status, json } = await req('POST', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
    body: { type: 'partial', percentage: 25 },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.scholarshipId = json.id;
}

async function testDuplicateScholarship() {
  const { status } = await req('POST', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
    body: { type: 'full' },
  });
  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testGetScholarship() {
  const { status, json } = await req('GET', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.type !== 'partial') throw new Error('Wrong type');
}

async function testUpdateScholarship() {
  const { status, json } = await req('PATCH', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
    body: { percentage: 50 },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

// ==================== PAYMENTS ====================
async function testCreatePayment() {
  const { status, json } = await req('POST', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
    body: {
      amount: '50000',
      paymentDate: '2099-09-15',
      paymentMethod: 'cash',
      quarterId: ids.quarterId,
    },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.status !== 'completed') throw new Error(`Admin payment should be completed, got ${json.status}`);
  ids.paymentId = json.id;
}

async function testListPayments() {
  const { status, json } = await req('GET', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data || json.data.length === 0) throw new Error('No payments');
}

async function testGetPayment() {
  const { status, json } = await req('GET', `/api/payments/${ids.paymentId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
}

async function testUpdatePayment() {
  const { status } = await req('PATCH', `/api/payments/${ids.paymentId}`, {
    token: adminToken,
    body: { notes: 'Test note' },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

// ==================== FINANCE ====================
async function testFinanceSummary() {
  const { status, json } = await req('GET', '/api/finance/summary', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.student_count === undefined) throw new Error('Missing student_count');
  if (json.total_expected === undefined) throw new Error('Missing total_expected');
  if (json.total_collected === undefined) throw new Error('Missing total_collected');
  if (json.total_remaining === undefined) throw new Error('Missing total_remaining');
}

async function testFinanceSummaryByClass() {
  const classFilter = ids.classId || ids.newClassId;
  const { status, json } = await req('GET', `/api/finance/summary?classId=${classFilter}`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

async function testQuarterFinance() {
  const { status, json } = await req('GET', `/api/quarters/${ids.quarterId}/finance`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.quarter_tuition === undefined) throw new Error('Missing quarter_tuition');
}

// ==================== AUDIT LOGS ====================
async function testListAuditLogs() {
  const { status, json } = await req('GET', '/api/audit-logs', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
  if (!json.pagination) throw new Error('No pagination');
  // Should have entries from all the operations above
  if (json.data.length === 0) throw new Error('Expected audit log entries');
}

async function testAuditLogsFilterByTable() {
  const { status, json } = await req('GET', '/api/audit-logs?tableName=school_years', {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  for (const log of json.data) {
    if (log.tableName !== 'school_years') throw new Error('Filter not working');
  }
}

// ==================== CLEANUP: delete scholarship ====================
async function testDeleteScholarship() {
  const { status } = await req('DELETE', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
  });
  if (status !== 204) throw new Error(`Status ${status}`);
}

async function testScholarshipGoneAfterDelete() {
  const { status } = await req('GET', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
  });
  if (status !== 404) throw new Error(`Expected 404, got ${status}`);
}

// ==================== ROLE-BASED ACCESS ====================
async function testSecretaryAccess() {
  // Create a secretary via admin API to ensure one exists (ignore 409 if already exists)
  const secEmail = `testsec.${Date.now()}@formel.school`;
  await req('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Test Sec', email: secEmail, password: 'testsec123', role: 'secretary' },
  });

  // Login as secretary
  savedCookies = '';
  const loginRes = await req('POST', '/api/auth/login', {
    body: { email: secEmail, password: 'testsec123' },
  });
  if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.status}`);
  const secToken = loginRes.json.accessToken;

  // Can read settings
  const r1 = await req('GET', '/api/settings', { token: secToken });
  if (r1.status !== 200) throw new Error(`Secretary GET settings: ${r1.status}`);

  // Cannot update settings
  const r2 = await req('PATCH', '/api/settings', { token: secToken, body: { schoolName: 'Hack' } });
  if (r2.status !== 403) throw new Error(`Secretary PATCH settings should be 403, got ${r2.status}`);

  // Can read classes
  const r3 = await req('GET', '/api/classes', { token: secToken });
  if (r3.status !== 200) throw new Error(`Secretary GET classes: ${r3.status}`);

  // Cannot create class
  const r4 = await req('POST', '/api/classes', {
    token: secToken,
    body: { name: 'Hack', gradeLevel: 100, annualTuitionFee: '1' },
  });
  if (r4.status !== 403) throw new Error(`Secretary POST classes should be 403, got ${r4.status}`);

  // Cannot access finance
  const r5 = await req('GET', '/api/finance/summary', { token: secToken });
  if (r5.status !== 403) throw new Error(`Secretary finance should be 403, got ${r5.status}`);

  // Cannot access audit logs
  const r6 = await req('GET', '/api/audit-logs', { token: secToken });
  if (r6.status !== 403) throw new Error(`Secretary audit should be 403, got ${r6.status}`);
}

// ==================== RUNNER ====================
async function main() {
  console.log(`\n\x1b[1mFull Backend API Tests\x1b[0m`);
  console.log(`Target: ${BASE_URL}\n`);

  // Login as admin
  savedCookies = '';
  const loginRes = await req('POST', '/api/auth/login', {
    body: { email: 'admin@formel.school', password: 'admin123' },
  });
  if (loginRes.status !== 200) {
    console.error('Admin login failed:', loginRes.status, loginRes.text);
    process.exit(1);
  }
  adminToken = loginRes.json.accessToken;

  console.log('\x1b[36m── School Settings ──\x1b[0m');
  await runTest('GET /settings', testGetSettings);
  await runTest('PATCH /settings — update', testUpdateSettings);
  await runTest('GET /settings — verify update', testGetSettingsAfterUpdate);

  console.log('\n\x1b[36m── School Years ──\x1b[0m');
  await runTest('GET /school-years — list', testListSchoolYears);
  await runTest('POST /school-years — create', testCreateSchoolYear);
  await runTest('POST /school-years — duplicate (409)', testCreateDuplicateSchoolYear);
  await runTest('GET /school-years/:id', testGetSchoolYear);
  await runTest('PATCH /school-years/:id — update', testUpdateSchoolYear);
  await runTest('PATCH /school-years/:id/activate', testActivateSchoolYear);

  console.log('\n\x1b[36m── Quarters ──\x1b[0m');
  await runTest('POST /school-years/:id/quarters — create 3', testCreateQuarters);
  await runTest('GET /school-years/:id/quarters — list', testListQuarters);
  await runTest('PATCH /quarters/:id — update', testUpdateQuarter);

  console.log('\n\x1b[36m── Classes ──\x1b[0m');
  await runTest('GET /classes — list', testListClasses);
  await runTest('POST /classes — create', testCreateClass);
  await runTest('GET /classes/:id', testGetClass);
  await runTest('PATCH /classes/:id — update', testUpdateClass);

  console.log('\n\x1b[36m── Enrollments ──\x1b[0m');
  await runTest('GET /students — get student for enrollment', testGetStudentForEnrollment);
  await runTest('POST /enrollments — create', testCreateEnrollment);
  await runTest('POST /enrollments — duplicate (409)', testDuplicateEnrollment);
  await runTest('GET /enrollments — list', testListEnrollments);
  await runTest('GET /enrollments/:id — with joins', testGetEnrollment);

  console.log('\n\x1b[36m── Scholarships ──\x1b[0m');
  await runTest('POST /enrollments/:id/scholarship — create partial', testCreateScholarship);
  await runTest('POST /enrollments/:id/scholarship — duplicate (409)', testDuplicateScholarship);
  await runTest('GET /enrollments/:id/scholarship', testGetScholarship);
  await runTest('PATCH /enrollments/:id/scholarship — update', testUpdateScholarship);

  console.log('\n\x1b[36m── Payments ──\x1b[0m');
  await runTest('POST /enrollments/:id/payments — admin (completed)', testCreatePayment);
  await runTest('GET /enrollments/:id/payments — list', testListPayments);
  await runTest('GET /payments/:id', testGetPayment);
  await runTest('PATCH /payments/:id — update notes', testUpdatePayment);

  console.log('\n\x1b[36m── Finance ──\x1b[0m');
  await runTest('GET /finance/summary', testFinanceSummary);
  await runTest('GET /finance/summary?classId=...', testFinanceSummaryByClass);
  await runTest('GET /quarters/:id/finance', testQuarterFinance);

  console.log('\n\x1b[36m── Audit Logs ──\x1b[0m');
  await runTest('GET /audit-logs — list', testListAuditLogs);
  await runTest('GET /audit-logs?tableName=school_years', testAuditLogsFilterByTable);

  console.log('\n\x1b[36m── Cleanup ──\x1b[0m');
  await runTest('DELETE /enrollments/:id/scholarship', testDeleteScholarship);
  await runTest('GET scholarship after delete (404)', testScholarshipGoneAfterDelete);

  console.log('\n\x1b[36m── Role-Based Access (Secretary) ──\x1b[0m');
  await runTest('Secretary: read/write permissions', testSecretaryAccess);

  // Summary
  console.log(`\n\x1b[1m── Summary ──\x1b[0m`);
  console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, ${passed + failed} total\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nTest runner error:', err);
  process.exit(1);
});
