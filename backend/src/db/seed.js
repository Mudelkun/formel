const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const schema = require('./schema');

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10);
  const [admin] = await db.insert(schema.users).values({
    name: 'Admin Principal',
    email: 'admin@formel.school',
    passwordHash,
    role: 'admin',
  }).returning();

  const [staff] = await db.insert(schema.users).values({
    name: 'Secrétaire Marie',
    email: 'marie@formel.school',
    passwordHash: await bcrypt.hash('staff123', 10),
    role: 'staff',
  }).returning();

  const [teacher] = await db.insert(schema.users).values({
    name: 'Prof. Jean',
    email: 'jean@formel.school',
    passwordHash: await bcrypt.hash('teacher123', 10),
    role: 'teacher',
  }).returning();

  console.log('✓ Users created (admin/staff/teacher)');

  // --- School Settings ---
  await db.insert(schema.schoolSettings).values({
    schoolName: 'École Formel',
    address: '123 Rue de l\'Éducation, Dakar',
    phone: '+221 33 123 4567',
    email: 'contact@formel.school',
  });
  console.log('✓ School settings created');

  // --- School Year ---
  const [schoolYear] = await db.insert(schema.schoolYears).values({
    year: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    isActive: true,
  }).returning();
  console.log('✓ School year created (2025-2026)');

  // --- Quarters ---
  const quarterData = [
    { schoolYearId: schoolYear.id, name: 'Trimestre 1', number: 1, startDate: '2025-09-01', endDate: '2025-11-30' },
    { schoolYearId: schoolYear.id, name: 'Trimestre 2', number: 2, startDate: '2025-12-01', endDate: '2026-02-28' },
    { schoolYearId: schoolYear.id, name: 'Trimestre 3', number: 3, startDate: '2026-03-01', endDate: '2026-06-30' },
  ];
  const quarters = await db.insert(schema.quarters).values(quarterData).returning();
  console.log('✓ 3 quarters created');

  // --- Classes ---
  const classData = [
    { name: 'CP1', gradeLevel: 1, annualTuitionFee: '150000' },
    { name: 'CP2', gradeLevel: 2, annualTuitionFee: '150000' },
    { name: 'CE1', gradeLevel: 3, annualTuitionFee: '175000' },
    { name: 'CE2', gradeLevel: 4, annualTuitionFee: '175000' },
    { name: 'CM1', gradeLevel: 5, annualTuitionFee: '200000' },
    { name: 'CM2', gradeLevel: 6, annualTuitionFee: '200000' },
  ];
  const classes = await db.insert(schema.classes).values(classData).returning();
  console.log('✓ 6 classes created');

  // --- Students ---
  const studentData = [
    { nie: 'NIE001', firstName: 'Amadou', lastName: 'Diallo', gender: 'male', birthDate: '2015-03-12', address: '45 Avenue Bourguiba, Dakar' },
    { nie: 'NIE002', firstName: 'Fatou', lastName: 'Ndiaye', gender: 'female', birthDate: '2014-07-25', address: '12 Rue Félix Faure, Dakar' },
    { nie: 'NIE003', firstName: 'Moussa', lastName: 'Sow', gender: 'male', birthDate: '2015-11-08', address: '78 Boulevard de la République' },
    { nie: 'NIE004', firstName: 'Aïssatou', lastName: 'Ba', gender: 'female', birthDate: '2013-01-15', address: '23 Rue Carnot, Dakar' },
    { nie: 'NIE005', firstName: 'Ibrahim', lastName: 'Fall', gender: 'male', birthDate: '2014-09-30', address: '56 Avenue Cheikh Anta Diop' },
    { nie: 'NIE006', firstName: 'Mariama', lastName: 'Diop', gender: 'female', birthDate: '2016-04-20', address: '9 Rue de Thiong, Dakar' },
    { nie: 'NIE007', firstName: 'Ousmane', lastName: 'Mbaye', gender: 'male', birthDate: '2015-06-03', status: 'active' },
    { nie: 'NIE008', firstName: 'Khady', lastName: 'Sarr', gender: 'female', birthDate: '2013-12-18', status: 'transfer' },
  ];
  const students = await db.insert(schema.students).values(studentData).returning();
  console.log('✓ 8 students created');

  // --- Contacts ---
  const contactData = [
    { studentId: students[0].id, firstName: 'Mamadou', lastName: 'Diallo', phone: '+221 77 111 1111', email: 'mamadou.diallo@email.com', relationship: 'father', isPrimary: true },
    { studentId: students[0].id, firstName: 'Awa', lastName: 'Diallo', phone: '+221 77 111 2222', email: 'awa.diallo@email.com', relationship: 'mother', isPrimary: false },
    { studentId: students[1].id, firstName: 'Ibrahima', lastName: 'Ndiaye', phone: '+221 77 222 1111', email: 'ibrahima.ndiaye@email.com', relationship: 'father', isPrimary: true },
    { studentId: students[2].id, firstName: 'Fatima', lastName: 'Sow', phone: '+221 77 333 1111', email: 'fatima.sow@email.com', relationship: 'mother', isPrimary: true },
    { studentId: students[3].id, firstName: 'Abdoulaye', lastName: 'Ba', phone: '+221 77 444 1111', email: 'abdoulaye.ba@email.com', relationship: 'father', isPrimary: true },
    { studentId: students[4].id, firstName: 'Aminata', lastName: 'Fall', phone: '+221 77 555 1111', email: 'aminata.fall@email.com', relationship: 'mother', isPrimary: true },
    { studentId: students[5].id, firstName: 'Cheikh', lastName: 'Diop', phone: '+221 77 666 1111', email: 'cheikh.diop@email.com', relationship: 'father', isPrimary: true },
  ];
  await db.insert(schema.contacts).values(contactData);
  console.log('✓ 7 contacts created');

  // --- Enrollments (active students in active school year) ---
  const enrollmentData = [
    { studentId: students[0].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Amadou -> CP1
    { studentId: students[1].id, classId: classes[1].id, schoolYearId: schoolYear.id }, // Fatou -> CP2
    { studentId: students[2].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Moussa -> CP1
    { studentId: students[3].id, classId: classes[2].id, schoolYearId: schoolYear.id }, // Aïssatou -> CE1
    { studentId: students[4].id, classId: classes[3].id, schoolYearId: schoolYear.id }, // Ibrahim -> CE2
    { studentId: students[5].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Mariama -> CP1
    { studentId: students[6].id, classId: classes[4].id, schoolYearId: schoolYear.id }, // Ousmane -> CM1
  ];
  const enrollments = await db.insert(schema.enrollments).values(enrollmentData).returning();
  console.log('✓ 7 enrollments created');

  // --- Scholarships ---
  await db.insert(schema.scholarships).values([
    { enrollmentId: enrollments[1].id, type: 'partial', percentage: '50' },    // Fatou: 50% off
    { enrollmentId: enrollments[3].id, type: 'full' },                          // Aïssatou: 100% off
    { enrollmentId: enrollments[5].id, type: 'fixed_amount', fixedAmount: '50000' }, // Mariama: 50k off
  ]);
  console.log('✓ 3 scholarships created');

  // --- Payments ---
  const paymentData = [
    // Amadou: paid Q1 fully
    { enrollmentId: enrollments[0].id, quarterId: quarters[0].id, amount: '50000', paymentDate: '2025-09-15', paymentMethod: 'cash', status: 'completed' },
    // Amadou: paid Q2 partially
    { enrollmentId: enrollments[0].id, quarterId: quarters[1].id, amount: '30000', paymentDate: '2025-12-10', paymentMethod: 'transfer', status: 'completed' },
    // Fatou: paid Q1 (with scholarship, owes 75k/3 = 25k per quarter)
    { enrollmentId: enrollments[1].id, quarterId: quarters[0].id, amount: '25000', paymentDate: '2025-09-20', paymentMethod: 'cash', status: 'completed' },
    // Moussa: one pending payment
    { enrollmentId: enrollments[2].id, quarterId: quarters[0].id, amount: '50000', paymentDate: '2025-10-01', paymentMethod: 'check', status: 'pending' },
    // Ibrahim: paid Q1 fully
    { enrollmentId: enrollments[4].id, quarterId: quarters[0].id, amount: '58333', paymentDate: '2025-09-18', paymentMethod: 'transfer', status: 'completed' },
    // Ousmane: paid Q1 and Q2
    { enrollmentId: enrollments[6].id, quarterId: quarters[0].id, amount: '66667', paymentDate: '2025-09-12', paymentMethod: 'cash', status: 'completed' },
    { enrollmentId: enrollments[6].id, quarterId: quarters[1].id, amount: '66667', paymentDate: '2025-12-05', paymentMethod: 'cash', status: 'completed' },
  ];
  await db.insert(schema.payments).values(paymentData);
  console.log('✓ 7 payments created');

  console.log('\nSeed complete!');
  console.log('\nTest accounts:');
  console.log('  admin@formel.school / admin123');
  console.log('  marie@formel.school / staff123');
  console.log('  jean@formel.school  / teacher123');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
