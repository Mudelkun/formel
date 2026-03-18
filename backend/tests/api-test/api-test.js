/**
 * Full Backend API Test Script
 *
 * Tests all endpoints: settings, school years, class groups, fees/versements,
 * classes, enrollments, scholarships, payments, balance, finance, audit logs.
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
const RUN_ID = Date.now();

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
  const { status } = await req('GET', '/api/settings', { token: adminToken });
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

async function testActivateSchoolYear() {
  const { status, json } = await req('PATCH', `/api/school-years/${ids.schoolYearId}/activate`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.isActive !== true) throw new Error('Not activated');
}

// ==================== CLASS GROUPS ====================
async function testListClassGroups() {
  const { status, json } = await req('GET', '/api/class-groups', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
}

async function testCreateClassGroup() {
  const { status, json } = await req('POST', '/api/class-groups', {
    token: adminToken,
    body: { name: `Primaire-${RUN_ID}` },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.classGroupId = json.id;
  ids.classGroupName = json.name;
}

async function testCreateDuplicateClassGroup() {
  const { status } = await req('POST', '/api/class-groups', {
    token: adminToken,
    body: { name: ids.classGroupName },
  });
  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testGetClassGroup() {
  const { status, json } = await req('GET', `/api/class-groups/${ids.classGroupId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.name !== ids.classGroupName) throw new Error('Wrong name');
}

async function testUpdateClassGroup() {
  const newName = `Primaire-Updated-${RUN_ID}`;
  const { status, json } = await req('PATCH', `/api/class-groups/${ids.classGroupId}`, {
    token: adminToken,
    body: { name: newName },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  ids.classGroupName = newName;
}

// ==================== FEES (bookFee + versements) ====================
async function testCreateFees() {
  const { status, json } = await req('POST', `/api/class-groups/${ids.classGroupId}/fees`, {
    token: adminToken,
    body: {
      schoolYearId: ids.schoolYearId,
      bookFee: '25000',
      versements: [
        { number: 1, name: '1er versement', amount: '30000', dueDate: '2099-10-15' },
        { number: 2, name: '2ème versement', amount: '40000', dueDate: '2100-01-15' },
        { number: 3, name: '3ème versement', amount: '30000', dueDate: '2100-04-15' },
      ],
    },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.bookFee !== '25000') throw new Error(`Wrong bookFee: ${json.bookFee}`);
  if (!json.versements || json.versements.length !== 3) throw new Error('Expected 3 versements');
  ids.versementId = json.versements[0].id;
}

async function testCreateDuplicateFees() {
  const { status } = await req('POST', `/api/class-groups/${ids.classGroupId}/fees`, {
    token: adminToken,
    body: {
      schoolYearId: ids.schoolYearId,
      bookFee: '10000',
      versements: [{ number: 1, name: 'V1', amount: '5000', dueDate: '2099-10-15' }],
    },
  });
  if (status !== 409) throw new Error(`Expected 409, got ${status}`);
}

async function testGetFees() {
  const { status, json } = await req('GET', `/api/class-groups/${ids.classGroupId}/fees?schoolYearId=${ids.schoolYearId}`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.bookFee !== '25000') throw new Error(`Wrong bookFee: ${json.bookFee}`);
  if (!json.versements || json.versements.length !== 3) throw new Error('Expected 3 versements');
}

async function testUpdateFees() {
  const { status, json } = await req('PUT', `/api/class-groups/${ids.classGroupId}/fees`, {
    token: adminToken,
    body: {
      schoolYearId: ids.schoolYearId,
      bookFee: '30000',
      versements: [
        { number: 1, name: '1er versement', amount: '25000', dueDate: '2099-10-15' },
        { number: 2, name: '2ème versement', amount: '45000', dueDate: '2100-01-15' },
        { number: 3, name: '3ème versement', amount: '25000', dueDate: '2100-04-15' },
      ],
    },
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.bookFee !== '30000') throw new Error(`Wrong bookFee after update: ${json.bookFee}`);
  ids.versementId = json.versements[0].id;
}

async function testUpdateSingleVersement() {
  const { status, json } = await req('PATCH', `/api/versements/${ids.versementId}`, {
    token: adminToken,
    body: { amount: '26000' },
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.amount !== '26000') throw new Error(`Wrong amount: ${json.amount}`);
}

// ==================== CLASSES ====================
async function testListClasses() {
  const { status, json } = await req('GET', '/api/classes', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
}

async function testCreateClass() {
  const gradeLevel = 900 + Math.floor(Math.random() * 100);
  const { status, json } = await req('POST', '/api/classes', {
    token: adminToken,
    body: { name: `Test Class ${gradeLevel}`, gradeLevel, classGroupId: ids.classGroupId },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  ids.newClassId = json.id;
}

async function testGetClass() {
  const { status, json } = await req('GET', `/api/classes/${ids.newClassId}`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.name.startsWith('Test Class')) throw new Error('Wrong name');
  if (json.classGroupId !== ids.classGroupId) throw new Error('Wrong classGroupId');
}

async function testUpdateClass() {
  const { status } = await req('PATCH', `/api/classes/${ids.newClassId}`, {
    token: adminToken,
    body: { name: 'Updated Class' },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

// ==================== ENROLLMENTS ====================
async function testGetStudentForEnrollment() {
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
      classId: ids.newClassId,
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
      classId: ids.newClassId,
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
  if (!json.classGroupName) throw new Error('Missing classGroupName');
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
  const { status } = await req('PATCH', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
    body: { percentage: 50 },
  });
  if (status !== 200) throw new Error(`Status ${status}`);
}

async function testDeleteScholarship() {
  const { status } = await req('DELETE', `/api/enrollments/${ids.enrollmentId}/scholarship`, {
    token: adminToken,
  });
  if (status !== 204) throw new Error(`Status ${status}`);
}

// ==================== PAYMENTS ====================
async function testCreateNonBookPayment() {
  const { status, json } = await req('POST', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
    body: {
      amount: '20000',
      paymentDate: '2099-09-15',
      paymentMethod: 'cash',
      isBookPayment: false,
    },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.status !== 'completed') throw new Error(`Admin payment should be completed`);
  if (json.isBookPayment !== false) throw new Error(`Should be non-book`);
  ids.paymentId = json.id;
}

async function testCreateBookPayment() {
  const { status, json } = await req('POST', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
    body: {
      amount: '15000',
      paymentDate: '2099-09-15',
      paymentMethod: 'cash',
      isBookPayment: true,
    },
  });
  if (status !== 201) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.isBookPayment !== true) throw new Error(`Should be book payment`);
  ids.bookPaymentId = json.id;
}

async function testListPayments() {
  const { status, json } = await req('GET', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data || json.data.length < 2) throw new Error(`Expected at least 2 payments, got ${json.data?.length}`);
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

// ==================== BALANCE ====================
async function testGetBalance() {
  const { status, json } = await req('GET', `/api/students/${ids.studentId}/balance`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);

  // Verify structure
  if (!json.versements) throw new Error('Missing versements');
  if (!json.books) throw new Error('Missing books');
  if (!json.total) throw new Error('Missing total');

  // Versements: total = 26000 + 45000 + 25000 = 96000, bookFee = 30000, total tuition = 126000
  // No scholarship (deleted above), so no discount
  // Non-book paid: 20000 → V1 (26000): paid 20000, remaining 6000
  // Book paid: 15000 → books remaining: 15000
  if (json.versements.length !== 3) throw new Error(`Expected 3 versements, got ${json.versements.length}`);
  if (json.versements[0].amountPaid !== 20000) throw new Error(`V1 paid should be 20000, got ${json.versements[0].amountPaid}`);
  if (json.versements[0].amountRemaining !== 6000) throw new Error(`V1 remaining should be 6000, got ${json.versements[0].amountRemaining}`);
  if (json.versements[0].isPaidInFull !== false) throw new Error('V1 should not be fully paid');
  if (json.books.amountPaid !== 15000) throw new Error(`Books paid should be 15000, got ${json.books.amountPaid}`);
  if (json.books.amountRemaining !== 15000) throw new Error(`Books remaining should be 15000, got ${json.books.amountRemaining}`);
  if (json.total.tuition !== 126000) throw new Error(`Total tuition should be 126000, got ${json.total.tuition}`);
  if (json.total.amountPaid !== 35000) throw new Error(`Total paid should be 35000, got ${json.total.amountPaid}`);
}

async function testGetBalanceWithMorePayments() {
  // Pay more to complete V1 and partially V2
  await req('POST', `/api/enrollments/${ids.enrollmentId}/payments`, {
    token: adminToken,
    body: { amount: '36000', paymentDate: '2099-12-01', paymentMethod: 'transfer', isBookPayment: false },
  });

  const { status, json } = await req('GET', `/api/students/${ids.studentId}/balance`, { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);

  // Non-book total: 20000 + 36000 = 56000
  // V1 (26000): paid 26000, remaining 0, isPaidInFull = true
  // V2 (45000): paid 30000, remaining 15000
  // V3 (25000): paid 0
  if (json.versements[0].isPaidInFull !== true) throw new Error('V1 should be fully paid now');
  if (json.versements[1].amountPaid !== 30000) throw new Error(`V2 paid should be 30000, got ${json.versements[1].amountPaid}`);
  if (json.versements[1].amountRemaining !== 15000) throw new Error(`V2 remaining should be 15000, got ${json.versements[1].amountRemaining}`);
  if (json.currentVersement && json.currentVersement.number !== 2) throw new Error(`Current versement should be 2, got ${json.currentVersement?.number}`);
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

async function testFinanceSummaryByClassGroup() {
  const { status, json } = await req('GET', `/api/finance/summary?classGroupId=${ids.classGroupId}`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (json.student_count < 1) throw new Error('Should have at least 1 student');
}

async function testVersementFinance() {
  const { status, json } = await req('GET', `/api/versements/${ids.versementId}/finance`, {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(json)}`);
  if (json.versement_expected === undefined) throw new Error('Missing versement_expected');
  if (json.total_collected === undefined) throw new Error('Missing total_collected');
}

// ==================== AUDIT LOGS ====================
async function testListAuditLogs() {
  const { status, json } = await req('GET', '/api/audit-logs', { token: adminToken });
  if (status !== 200) throw new Error(`Status ${status}`);
  if (!json.data) throw new Error('No data');
  if (json.data.length === 0) throw new Error('Expected audit log entries');
}

async function testAuditLogsFilterByTable() {
  const { status, json } = await req('GET', '/api/audit-logs?tableName=class_groups', {
    token: adminToken,
  });
  if (status !== 200) throw new Error(`Status ${status}`);
  for (const entry of json.data) {
    if (entry.tableName !== 'class_groups') throw new Error('Filter not working');
  }
}

// ==================== ROLE-BASED ACCESS ====================
async function testSecretaryAccess() {
  const secEmail = `testsec.${Date.now()}@formel.school`;
  await req('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Test Sec', email: secEmail, password: 'testsec123', role: 'secretary' },
  });

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

  // Can read class groups
  const r3 = await req('GET', '/api/class-groups', { token: secToken });
  if (r3.status !== 200) throw new Error(`Secretary GET class-groups: ${r3.status}`);

  // Cannot create class group
  const r4 = await req('POST', '/api/class-groups', { token: secToken, body: { name: 'Hack' } });
  if (r4.status !== 403) throw new Error(`Secretary POST class-groups should be 403, got ${r4.status}`);

  // Cannot access finance
  const r5 = await req('GET', '/api/finance/summary', { token: secToken });
  if (r5.status !== 403) throw new Error(`Secretary finance should be 403, got ${r5.status}`);

  // Cannot access audit logs
  const r6 = await req('GET', '/api/audit-logs', { token: secToken });
  if (r6.status !== 403) throw new Error(`Secretary audit should be 403, got ${r6.status}`);
}

// ==================== RUNNER ====================
async function main() {
  console.log(`\n\x1b[1mFull Backend API Tests (Versement System)\x1b[0m`);
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
  await runTest('PATCH /school-years/:id/activate', testActivateSchoolYear);

  console.log('\n\x1b[36m── Class Groups ──\x1b[0m');
  await runTest('GET /class-groups — list', testListClassGroups);
  await runTest('POST /class-groups — create', testCreateClassGroup);
  await runTest('POST /class-groups — duplicate (409)', testCreateDuplicateClassGroup);
  await runTest('GET /class-groups/:id', testGetClassGroup);
  await runTest('PATCH /class-groups/:id — update', testUpdateClassGroup);

  console.log('\n\x1b[36m── Fees & Versements ──\x1b[0m');
  await runTest('POST /class-groups/:id/fees — create (bookFee + 3 versements)', testCreateFees);
  await runTest('POST /class-groups/:id/fees — duplicate (409)', testCreateDuplicateFees);
  await runTest('GET /class-groups/:id/fees — get', testGetFees);
  await runTest('PUT /class-groups/:id/fees — replace', testUpdateFees);
  await runTest('PATCH /versements/:id — update single', testUpdateSingleVersement);

  console.log('\n\x1b[36m── Classes ──\x1b[0m');
  await runTest('GET /classes — list', testListClasses);
  await runTest('POST /classes — create with classGroupId', testCreateClass);
  await runTest('GET /classes/:id', testGetClass);
  await runTest('PATCH /classes/:id — update', testUpdateClass);

  console.log('\n\x1b[36m── Enrollments ──\x1b[0m');
  await runTest('GET /students — get student for enrollment', testGetStudentForEnrollment);
  await runTest('POST /enrollments — create', testCreateEnrollment);
  await runTest('POST /enrollments — duplicate (409)', testDuplicateEnrollment);
  await runTest('GET /enrollments — list', testListEnrollments);
  await runTest('GET /enrollments/:id — with classGroup join', testGetEnrollment);

  console.log('\n\x1b[36m── Scholarships ──\x1b[0m');
  await runTest('POST /enrollments/:id/scholarship — create partial', testCreateScholarship);
  await runTest('POST /enrollments/:id/scholarship — duplicate (409)', testDuplicateScholarship);
  await runTest('GET /enrollments/:id/scholarship', testGetScholarship);
  await runTest('PATCH /enrollments/:id/scholarship — update', testUpdateScholarship);
  await runTest('DELETE /enrollments/:id/scholarship', testDeleteScholarship);

  console.log('\n\x1b[36m── Payments ──\x1b[0m');
  await runTest('POST /enrollments/:id/payments — non-book', testCreateNonBookPayment);
  await runTest('POST /enrollments/:id/payments — book', testCreateBookPayment);
  await runTest('GET /enrollments/:id/payments — list', testListPayments);
  await runTest('GET /payments/:id', testGetPayment);
  await runTest('PATCH /payments/:id — update notes', testUpdatePayment);

  console.log('\n\x1b[36m── Balance (Versement Allocation) ──\x1b[0m');
  await runTest('GET /students/:id/balance — initial', testGetBalance);
  await runTest('GET /students/:id/balance — after more payments', testGetBalanceWithMorePayments);

  console.log('\n\x1b[36m── Finance ──\x1b[0m');
  await runTest('GET /finance/summary', testFinanceSummary);
  await runTest('GET /finance/summary?classGroupId=...', testFinanceSummaryByClassGroup);
  await runTest('GET /versements/:id/finance', testVersementFinance);

  console.log('\n\x1b[36m── Audit Logs ──\x1b[0m');
  await runTest('GET /audit-logs — list', testListAuditLogs);
  await runTest('GET /audit-logs?tableName=class_groups', testAuditLogsFilterByTable);

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
