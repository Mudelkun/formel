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

  const [secretary] = await db.insert(schema.users).values({
    name: 'Secrétaire Marie',
    email: 'marie@formel.school',
    passwordHash: await bcrypt.hash('secretary123', 10),
    role: 'secretary',
  }).returning();

  const [teacher] = await db.insert(schema.users).values({
    name: 'Prof. Jean',
    email: 'jean@formel.school',
    passwordHash: await bcrypt.hash('teacher123', 10),
    role: 'teacher',
  }).returning();

  console.log('✓ Users created (admin/secretary/teacher)');

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

  // --- Class Groups ---
  const [primaire] = await db.insert(schema.classGroups).values({
    name: 'Primaire',
  }).returning();

  const [secondaire] = await db.insert(schema.classGroups).values({
    name: 'Secondaire',
  }).returning();
  console.log('✓ 2 class groups created (Primaire, Secondaire)');

  // --- Fee Configs (bookFee per classGroup + schoolYear) ---
  await db.insert(schema.feeConfigs).values([
    { classGroupId: primaire.id, schoolYearId: schoolYear.id, bookFee: '25000' },
    { classGroupId: secondaire.id, schoolYearId: schoolYear.id, bookFee: '35000' },
  ]);
  console.log('✓ Fee configs created');

  // --- Versements ---
  await db.insert(schema.versements).values([
    // Primaire versements
    { classGroupId: primaire.id, schoolYearId: schoolYear.id, number: 1, name: '1er versement', amount: '50000', dueDate: '2025-10-15' },
    { classGroupId: primaire.id, schoolYearId: schoolYear.id, number: 2, name: '2ème versement', amount: '50000', dueDate: '2026-01-15' },
    { classGroupId: primaire.id, schoolYearId: schoolYear.id, number: 3, name: '3ème versement', amount: '50000', dueDate: '2026-04-15' },
    // Secondaire versements
    { classGroupId: secondaire.id, schoolYearId: schoolYear.id, number: 1, name: '1er versement', amount: '65000', dueDate: '2025-10-15' },
    { classGroupId: secondaire.id, schoolYearId: schoolYear.id, number: 2, name: '2ème versement', amount: '65000', dueDate: '2026-01-15' },
    { classGroupId: secondaire.id, schoolYearId: schoolYear.id, number: 3, name: '3ème versement', amount: '65000', dueDate: '2026-04-15' },
  ]);
  console.log('✓ 6 versements created (3 per group)');

  // --- Classes ---
  const classData = [
    { name: 'CP1', gradeLevel: 1, classGroupId: primaire.id },
    { name: 'CP2', gradeLevel: 2, classGroupId: primaire.id },
    { name: 'CE1', gradeLevel: 3, classGroupId: primaire.id },
    { name: 'CE2', gradeLevel: 4, classGroupId: primaire.id },
    { name: 'CM1', gradeLevel: 5, classGroupId: secondaire.id },
    { name: 'CM2', gradeLevel: 6, classGroupId: secondaire.id },
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
    { studentId: students[0].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Amadou -> CP1 (Primaire)
    { studentId: students[1].id, classId: classes[1].id, schoolYearId: schoolYear.id }, // Fatou -> CP2 (Primaire)
    { studentId: students[2].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Moussa -> CP1 (Primaire)
    { studentId: students[3].id, classId: classes[2].id, schoolYearId: schoolYear.id }, // Aïssatou -> CE1 (Primaire)
    { studentId: students[4].id, classId: classes[3].id, schoolYearId: schoolYear.id }, // Ibrahim -> CE2 (Primaire)
    { studentId: students[5].id, classId: classes[0].id, schoolYearId: schoolYear.id }, // Mariama -> CP1 (Primaire)
    { studentId: students[6].id, classId: classes[4].id, schoolYearId: schoolYear.id }, // Ousmane -> CM1 (Secondaire)
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
    // Amadou: paid 1er versement fully (50000) + partial book payment
    { enrollmentId: enrollments[0].id, amount: '50000', paymentDate: '2025-09-15', paymentMethod: 'cash', status: 'completed', isBookPayment: false },
    { enrollmentId: enrollments[0].id, amount: '15000', paymentDate: '2025-09-15', paymentMethod: 'cash', status: 'completed', isBookPayment: true },
    // Amadou: partial 2ème versement
    { enrollmentId: enrollments[0].id, amount: '30000', paymentDate: '2025-12-10', paymentMethod: 'transfer', status: 'completed', isBookPayment: false },
    // Fatou: paid toward versements (with 50% scholarship)
    { enrollmentId: enrollments[1].id, amount: '25000', paymentDate: '2025-09-20', paymentMethod: 'cash', status: 'completed', isBookPayment: false },
    // Moussa: one pending payment
    { enrollmentId: enrollments[2].id, amount: '50000', paymentDate: '2025-10-01', paymentMethod: 'check', status: 'pending', isBookPayment: false },
    // Ibrahim: paid 1er versement
    { enrollmentId: enrollments[4].id, amount: '50000', paymentDate: '2025-09-18', paymentMethod: 'transfer', status: 'completed', isBookPayment: false },
    // Ousmane: paid 1er and 2ème versement (Secondaire: 65000 each)
    { enrollmentId: enrollments[6].id, amount: '65000', paymentDate: '2025-09-12', paymentMethod: 'cash', status: 'completed', isBookPayment: false },
    { enrollmentId: enrollments[6].id, amount: '65000', paymentDate: '2025-12-05', paymentMethod: 'cash', status: 'completed', isBookPayment: false },
  ];
  await db.insert(schema.payments).values(paymentData);
  console.log('✓ 8 payments created');

  console.log('\nSeed complete!');
  console.log('\nTest accounts:');
  console.log('  admin@formel.school / admin123');
  console.log('  marie@formel.school / secretary123');
  console.log('  jean@formel.school  / teacher123');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
