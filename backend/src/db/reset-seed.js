const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const schema = require('./schema');

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

// ── Name pools ────────────────────────────────────────────────────────────────

const FIRST_NAMES_M = [
  'Jean', 'Pierre', 'Marc', 'Jacques', 'Emmanuel', 'Paul', 'Joseph', 'Samuel',
  'David', 'Gabriel', 'Frantz', 'Réginald', 'Eddy', 'Patrick', 'Stéphane',
  'Michel', 'Claude', 'André', 'Robert', 'Luc', 'Yves', 'Henri', 'Gérard',
  'Maxime', 'Daniel', 'Olivier', 'Kévin', 'Wilner', 'Woodly', 'Dieunord',
];

const FIRST_NAMES_F = [
  'Marie', 'Rose', 'Jeanne', 'Nadine', 'Esther', 'Ruth', 'Judith', 'Fabiola',
  'Nathalie', 'Guerda', 'Mireille', 'Ketia', 'Sophia', 'Jocelyne', 'Isabelle',
  'Claire', 'Béatrice', 'Carole', 'Lucienne', 'Daphné', 'Mirlande', 'Tatiana',
  'Sandra', 'Vanessa', 'Pascale', 'Darline', 'Loudjena', 'Sherlanda', 'Wideline', 'Nahomie',
];

const LAST_NAMES = [
  'Jean-Baptiste', 'Pierre', 'Duval', 'Joseph', 'Charles', 'Augustin',
  'Saint-Louis', 'Desrosiers', 'Louissaint', 'François', 'Thermidor', 'Noël',
  'Narcisse', 'Jeanty', 'Bellegarde', 'Alcindor', 'Innocent', 'Bien-Aimé',
  'Toussaint', 'Éveillard', 'Prophète', 'Saintil', 'Dorcé', 'Chéry',
  'Hyppolite', 'Démosthène', 'Régis', 'Célestin', 'Lafortune', 'Baptiste',
  'Moïse', 'Sylvain', 'Fortuné', 'Gilles', 'Marcelin', 'Zamor',
  'Voltaire', 'Casimir', 'Estimé', 'Péralte',
];

const CONTACT_FIRST_M = [
  'Jean-Robert', 'Ernst', 'Wilfrid', 'Gérald', 'Ronald', 'Fritz', 'Serge',
  'Philippe', 'Hérold', 'Dieudonné', 'Raymond', 'Wilson', 'Garry', 'Joël', 'René',
];

const CONTACT_FIRST_F = [
  'Marie-Ange', 'Yolande', 'Marlène', 'Ghislaine', 'Magalie', 'Yanick', 'Élise',
  'Dominique', 'Bernadette', 'Margareth', 'Roseline', 'Ginette', 'Suze', 'Lourdes', 'Mimose',
];

const RELATIONSHIPS = ['Mère', 'Père', 'Parent', 'Tuteur'];

const PAYMENT_METHODS = [
  'cash', 'cash', 'cash', 'cash', 'cash', 'cash',    // 60%
  'transfer', 'transfer', 'transfer',                  // 15%
  'check', 'check',                                    // 10%
  'mobile', 'mobile',                                  // 10%
  'deposit',                                           // 5%
];

// ── Class structure ───────────────────────────────────────────────────────────

const CLASS_GROUPS_DEF = [
  { name: 'Préscolaire', bookFee: '3000', versementAmount: '15000' },
  { name: 'Primaire', bookFee: '4500', versementAmount: '18000' },
  { name: 'Collège', bookFee: '6000', versementAmount: '22000' },
  { name: 'Lycée', bookFee: '7500', versementAmount: '25000' },
];

const CLASSES_DEF = [
  // Préscolaire
  { name: 'Toute Petite Section', gradeLevel: 1, group: 'Préscolaire' },
  { name: 'Petite Section', gradeLevel: 2, group: 'Préscolaire' },
  { name: 'Moyenne Section', gradeLevel: 3, group: 'Préscolaire' },
  { name: 'Grande Section', gradeLevel: 4, group: 'Préscolaire' },
  // Primaire
  { name: 'CP', gradeLevel: 5, group: 'Primaire' },
  { name: 'CE1', gradeLevel: 6, group: 'Primaire' },
  { name: 'CE2', gradeLevel: 7, group: 'Primaire' },
  { name: 'CM1', gradeLevel: 8, group: 'Primaire' },
  { name: 'CM2', gradeLevel: 9, group: 'Primaire' },
  // Collège
  { name: '6e', gradeLevel: 10, group: 'Collège' },
  { name: '5e', gradeLevel: 11, group: 'Collège' },
  { name: '4e', gradeLevel: 12, group: 'Collège' },
  { name: '3e', gradeLevel: 13, group: 'Collège' },
  // Lycée
  { name: '2nde', gradeLevel: 14, group: 'Lycée' },
  { name: '1ère', gradeLevel: 15, group: 'Lycée' },
  { name: 'Terminale', gradeLevel: 16, group: 'Lycée' },
];

// Students per class for 2023-2024
const STUDENTS_PER_CLASS_2023 = {
  1: 20, 2: 25, 3: 25, 4: 25,           // Préscolaire
  5: 30, 6: 30, 7: 30, 8: 30, 9: 30,    // Primaire
  10: 28, 11: 28, 12: 25, 13: 25,        // Collège
  14: 22, 15: 20, 16: 18,                // Lycée
};

// New students entering in 2024-2025 (only TPS and PS)
const NEW_STUDENTS_2024 = { 1: 22, 2: 18 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function makeStudentData(index, gradeLevel, isNew2024) {
  const isMale = index % 2 === 0;
  const gender = isMale ? 'male' : 'female';
  const firstName = isMale
    ? FIRST_NAMES_M[index % FIRST_NAMES_M.length]
    : FIRST_NAMES_F[index % FIRST_NAMES_F.length];
  const lastName = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length];

  // Age-appropriate birth date
  const birthYear = 2024 - (gradeLevel + 3);
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 28) + 1).padStart(2, '0');
  const birthDate = `${birthYear}-${month}-${day}`;

  const nie = index % 3 === 0 ? `NIE-${String(index).padStart(5, '0')}` : null;

  return {
    firstName,
    lastName,
    gender,
    birthDate,
    nie,
    gradeLevel2023: isNew2024 ? null : gradeLevel,
    gradeLevel2024: isNew2024 ? gradeLevel : null,
  };
}

// ── Confirmation prompt ───────────────────────────────────────────────────────

function askConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('');
    console.log('\x1b[33m⚠️  ATTENTION: Cette opération va SUPPRIMER toutes les données de la base de données.\x1b[0m');
    console.log('Toutes les tables seront vidées et remplacées par des données de démonstration.');
    console.log('');
    rl.question('Êtes-vous sûr de vouloir continuer ? (oui/non) : ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'oui');
    });
  });
}

// ── Clear tables ──────────────────────────────────────────────────────────────

async function clearAllTables() {
  console.log('\nSuppression des données existantes...');
  await db.delete(schema.auditLogs);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.paymentDocuments);
  await db.delete(schema.scholarships);
  await db.delete(schema.payments);
  await db.delete(schema.enrollments);
  await db.delete(schema.contacts);
  await db.delete(schema.studentDocuments);
  await db.delete(schema.versements);
  await db.delete(schema.feeConfigs);
  await db.delete(schema.classes);
  await db.delete(schema.students);
  await db.delete(schema.classGroups);
  await db.delete(schema.schoolYears);
  await db.delete(schema.users);
  await db.delete(schema.schoolSettings);
  console.log('✓ Toutes les tables ont été vidées');
}

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log('\nCréation des utilisateurs...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('password123', 10);

  const users = await db.insert(schema.users).values([
    { name: 'Admin Principal', email: 'admin@formel.school', passwordHash: adminHash, role: 'admin' },
    { name: 'Marie Claire Joseph', email: 'secretary@formel.school', passwordHash: staffHash, role: 'secretary' },
  ]).returning();
  console.log(`✓ ${users.length} utilisateurs créés`);
  return users;
}

async function seedSchoolSettings() {
  await db.insert(schema.schoolSettings).values({
    schoolName: 'École Formel',
    address: 'Port-au-Prince, Haïti',
    phone: '+509 00 000 0000',
    email: 'contact@formel.school',
    currency: 'HTG',
  });
  console.log('✓ Paramètres scolaires créés');
}

async function seedClassGroups() {
  const groups = await db.insert(schema.classGroups).values(
    CLASS_GROUPS_DEF.map((g) => ({ name: g.name }))
  ).returning();
  console.log(`✓ ${groups.length} groupes de classes créés`);
  return groups;
}

async function seedClasses(groups) {
  const groupMap = {};
  for (const g of groups) groupMap[g.name] = g.id;

  const classesList = await db.insert(schema.classes).values(
    CLASSES_DEF.map((c) => ({
      name: c.name,
      gradeLevel: c.gradeLevel,
      classGroupId: groupMap[c.group],
    }))
  ).returning();
  console.log(`✓ ${classesList.length} classes créées`);
  return classesList;
}

async function seedSchoolYears() {
  const years = await db.insert(schema.schoolYears).values([
    { year: '2023-2024', startDate: '2023-09-04', endDate: '2024-06-28', isActive: false },
    { year: '2024-2025', startDate: '2024-09-02', endDate: '2025-06-27', isActive: true },
  ]).returning();
  console.log(`✓ ${years.length} années scolaires créées`);
  return years;
}

async function seedFeeConfigs(groups, years) {
  const groupDefMap = {};
  for (const gd of CLASS_GROUPS_DEF) groupDefMap[gd.name] = gd;

  const values = [];
  for (const year of years) {
    for (const group of groups) {
      values.push({
        classGroupId: group.id,
        schoolYearId: year.id,
        bookFee: groupDefMap[group.name].bookFee,
      });
    }
  }

  const created = await db.insert(schema.feeConfigs).values(values).returning();
  console.log(`✓ ${created.length} configurations de frais créées`);
  return created;
}

async function seedVersements(groups, years) {
  const groupDefMap = {};
  for (const gd of CLASS_GROUPS_DEF) groupDefMap[gd.name] = gd;

  const values = [];
  for (const year of years) {
    const yearStart = parseInt(year.year.split('-')[0]);
    for (const group of groups) {
      const amt = groupDefMap[group.name].versementAmount;
      values.push(
        { classGroupId: group.id, schoolYearId: year.id, number: 1, name: 'Octobre', amount: amt, dueDate: `${yearStart}-10-15` },
        { classGroupId: group.id, schoolYearId: year.id, number: 2, name: 'Janvier', amount: amt, dueDate: `${yearStart + 1}-01-15` },
        { classGroupId: group.id, schoolYearId: year.id, number: 3, name: 'Avril', amount: amt, dueDate: `${yearStart + 1}-04-15` },
      );
    }
  }

  const created = await db.insert(schema.versements).values(values).returning();
  console.log(`✓ ${created.length} versements créés`);
  return created;
}

async function seedStudents() {
  console.log('\nCréation des élèves...');

  const studentDataList = [];
  let globalIndex = 0;

  // 2023-2024 original students
  for (const [gradeStr, count] of Object.entries(STUDENTS_PER_CLASS_2023)) {
    const grade = parseInt(gradeStr);
    for (let i = 0; i < count; i++) {
      studentDataList.push(makeStudentData(globalIndex, grade, false));
      globalIndex++;
    }
  }

  // New students for 2024-2025
  for (const [gradeStr, count] of Object.entries(NEW_STUDENTS_2024)) {
    const grade = parseInt(gradeStr);
    for (let i = 0; i < count; i++) {
      studentDataList.push(makeStudentData(globalIndex, grade, true));
      globalIndex++;
    }
  }

  const created = await db.insert(schema.students).values(
    studentDataList.map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      birthDate: s.birthDate,
      nie: s.nie,
      status: 'active',
      scholarshipRecipient: false,
    }))
  ).returning();

  // Mark Terminale graduates
  const graduatedIds = [];
  for (let i = 0; i < studentDataList.length; i++) {
    if (studentDataList[i].gradeLevel2023 === 16) {
      graduatedIds.push(created[i].id);
    }
  }
  for (const id of graduatedIds) {
    await db.update(schema.students).set({ status: 'graduated', updatedAt: new Date() }).where(eq(schema.students.id, id));
  }

  console.log(`✓ ${created.length} élèves créés (dont ${graduatedIds.length} diplômés)`);
  return { records: created, meta: studentDataList };
}

async function seedEnrollments(studentRecords, studentMeta, classes, years) {
  console.log('\nCréation des inscriptions...');

  const classByGrade = {};
  for (const c of classes) classByGrade[c.gradeLevel] = c.id;

  const yearMap = {};
  for (const y of years) yearMap[y.year] = y.id;

  const values2023 = [];
  const values2024 = [];

  for (let i = 0; i < studentMeta.length; i++) {
    const s = studentMeta[i];
    const studentId = studentRecords[i].id;

    if (s.gradeLevel2023) {
      // 2023-2024 enrollment
      values2023.push({
        studentId,
        classId: classByGrade[s.gradeLevel2023],
        schoolYearId: yearMap['2023-2024'],
        status: 'enrolled',
      });

      // 2024-2025: promote if next grade exists
      const nextGrade = s.gradeLevel2023 + 1;
      if (classByGrade[nextGrade]) {
        values2024.push({
          studentId,
          classId: classByGrade[nextGrade],
          schoolYearId: yearMap['2024-2025'],
          status: 'enrolled',
        });
      }
      // grade 16 (Terminale) -> graduated, no 2024-2025 enrollment
    } else if (s.gradeLevel2024) {
      // New student for 2024-2025
      values2024.push({
        studentId,
        classId: classByGrade[s.gradeLevel2024],
        schoolYearId: yearMap['2024-2025'],
        status: 'enrolled',
      });
    }
  }

  const enrolled2023 = await db.insert(schema.enrollments).values(values2023).returning();
  const enrolled2024 = await db.insert(schema.enrollments).values(values2024).returning();
  console.log(`✓ ${enrolled2023.length} inscriptions 2023-2024`);
  console.log(`✓ ${enrolled2024.length} inscriptions 2024-2025`);
  return { enrolled2023, enrolled2024 };
}

async function seedContacts(studentRecords, studentMeta) {
  console.log('\nCréation des contacts...');
  const values = [];

  for (let i = 0; i < studentRecords.length; i++) {
    const student = studentRecords[i];
    const meta = studentMeta[i];

    // Primary contact (mother or father)
    const primaryIsMother = i % 2 === 0;
    const pFirstName = primaryIsMother
      ? CONTACT_FIRST_F[i % CONTACT_FIRST_F.length]
      : CONTACT_FIRST_M[i % CONTACT_FIRST_M.length];
    const pEmail = `${stripAccents(pFirstName)}.${stripAccents(meta.lastName)}${i}@gmail.com`;

    values.push({
      studentId: student.id,
      firstName: pFirstName,
      lastName: meta.lastName,
      phone: `+509 ${String(3000 + i).slice(-4)} ${String(1000 + (i * 7) % 9000).slice(-4)}`,
      email: pEmail,
      relationship: primaryIsMother ? 'Mère' : 'Père',
      isPrimary: true,
    });

    // ~65% get a second contact
    if (i % 3 !== 0) {
      const secIsMother = !primaryIsMother;
      const sFirstName = secIsMother
        ? CONTACT_FIRST_F[(i + 5) % CONTACT_FIRST_F.length]
        : CONTACT_FIRST_M[(i + 5) % CONTACT_FIRST_M.length];
      const sEmail = `${stripAccents(sFirstName)}.${stripAccents(meta.lastName)}${i}s@gmail.com`;

      values.push({
        studentId: student.id,
        firstName: sFirstName,
        lastName: meta.lastName,
        phone: `+509 ${String(4000 + i).slice(-4)} ${String(2000 + (i * 11) % 9000).slice(-4)}`,
        email: sEmail,
        relationship: secIsMother ? 'Mère' : 'Père',
        isPrimary: false,
      });
    }
  }

  // Batch insert in chunks to avoid overly large queries
  const BATCH = 200;
  let total = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const batch = values.slice(i, i + BATCH);
    await db.insert(schema.contacts).values(batch);
    total += batch.length;
  }
  console.log(`✓ ${total} contacts créés`);
}

async function seedScholarships(enrolled2024, classes, versements, groups, years, studentRecords, studentMeta) {
  console.log('\nCréation des bourses...');

  const classById = {};
  for (const c of classes) classById[c.id] = c;

  const groupById = {};
  for (const g of groups) groupById[g.id] = g;

  const groupDefMap = {};
  for (const gd of CLASS_GROUPS_DEF) groupDefMap[gd.name] = gd;

  const year2024 = years.find((y) => y.year === '2024-2025');

  // Versement lookup: groupId-yearId -> sorted versements
  const versementLookup = {};
  for (const v of versements) {
    const key = `${v.classGroupId}-${v.schoolYearId}`;
    if (!versementLookup[key]) versementLookup[key] = [];
    versementLookup[key].push(v);
  }
  for (const key of Object.keys(versementLookup)) {
    versementLookup[key].sort((a, b) => a.number - b.number);
  }

  const scholarshipValues = [];
  const scholarshipStudentIds = new Set();

  // Pick every 9th enrollment for scholarships (~12% of ~433 = ~48 students)
  for (let i = 0; i < enrolled2024.length; i++) {
    if (i % 9 !== 0) continue;

    const enr = enrolled2024[i];
    const cls = classById[enr.classId];
    const group = groupById[cls.classGroupId];
    const key = `${cls.classGroupId}-${year2024.id}`;
    const vers = versementLookup[key] || [];

    const typeIndex = scholarshipValues.length % 4;
    scholarshipStudentIds.add(enr.studentId);

    if (typeIndex === 0) {
      // partial
      const pct = 25 + (scholarshipValues.length * 13) % 51; // 25-75
      scholarshipValues.push({
        enrollmentId: enr.id,
        type: 'partial',
        percentage: String(pct),
      });
    } else if (typeIndex === 1) {
      // fixed_amount
      const amt = 5000 + (scholarshipValues.length * 2500) % 16000; // 5000-20000
      scholarshipValues.push({
        enrollmentId: enr.id,
        type: 'fixed_amount',
        fixedAmount: String(amt),
      });
    } else if (typeIndex === 2 && vers.length > 0) {
      // versement_annulation — cancel the first versement
      const targetVers = vers[0];
      scholarshipValues.push({
        enrollmentId: enr.id,
        type: 'versement_annulation',
        targetVersementId: targetVers.id,
        fixedAmount: targetVers.amount,
      });
    } else {
      // book_annulation
      const bookFee = groupDefMap[group.name].bookFee;
      scholarshipValues.push({
        enrollmentId: enr.id,
        type: 'book_annulation',
        fixedAmount: bookFee,
        isBookAnnulation: true,
      });
    }
  }

  if (scholarshipValues.length > 0) {
    await db.insert(schema.scholarships).values(scholarshipValues);
  }

  // Update students as scholarship recipients
  for (const studentId of scholarshipStudentIds) {
    await db.update(schema.students)
      .set({ scholarshipRecipient: true, updatedAt: new Date() })
      .where(eq(schema.students.id, studentId));
  }

  console.log(`✓ ${scholarshipValues.length} bourses créées (${scholarshipStudentIds.size} élèves boursiers)`);
  return { scholarshipStudentIds };
}

async function seedPayments(enrolled2023, enrolled2024, classes, versements, feeConfigs, years, scholarshipStudentIds) {
  console.log('\nCréation des paiements...');

  const classById = {};
  for (const c of classes) classById[c.id] = c;

  // Versement lookup: groupId-yearId -> sorted versements
  const versementLookup = {};
  for (const v of versements) {
    const key = `${v.classGroupId}-${v.schoolYearId}`;
    if (!versementLookup[key]) versementLookup[key] = [];
    versementLookup[key].push(v);
  }
  for (const key of Object.keys(versementLookup)) {
    versementLookup[key].sort((a, b) => a.number - b.number);
  }

  // Fee config lookup: groupId-yearId -> feeConfig
  const feeConfigLookup = {};
  for (const fc of feeConfigs) {
    feeConfigLookup[`${fc.classGroupId}-${fc.schoolYearId}`] = fc;
  }

  const year2023 = years.find((y) => y.year === '2023-2024');
  const year2024 = years.find((y) => y.year === '2024-2025');

  const paymentValues = [];
  let pIdx = 0;

  // ── 2023-2024 payments (all completed) ──────────────────────────────────
  for (let i = 0; i < enrolled2023.length; i++) {
    const enr = enrolled2023[i];
    const cls = classById[enr.classId];
    const key = `${cls.classGroupId}-${year2023.id}`;
    const vers = versementLookup[key] || [];
    const fc = feeConfigLookup[key];

    // 3 versement payments (90% pay all 3, 10% skip last)
    const versCount = (i % 10 === 0) ? 2 : 3;
    for (let v = 0; v < Math.min(versCount, vers.length); v++) {
      const dayOffset = ((i + v) % 15) - 5; // -5 to +9
      paymentValues.push({
        enrollmentId: enr.id,
        amount: vers[v].amount,
        paymentDate: offsetDate(vers[v].dueDate, dayOffset),
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: false,
        status: 'completed',
        notes: (i % 20 === 0 && v === 2) ? 'Paiement en retard' : null,
      });
      pIdx++;
    }

    // Book payment for ~80%
    if (i % 5 !== 0 && fc) {
      paymentValues.push({
        enrollmentId: enr.id,
        amount: fc.bookFee,
        paymentDate: `2023-09-${String(5 + (i % 20)).padStart(2, '0')}`,
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: true,
        status: 'completed',
        notes: null,
      });
      pIdx++;
    }
  }

  // ── 2024-2025 payments (mixed status) ───────────────────────────────────
  for (let i = 0; i < enrolled2024.length; i++) {
    const enr = enrolled2024[i];
    const cls = classById[enr.classId];
    const key = `${cls.classGroupId}-${year2024.id}`;
    const vers = versementLookup[key] || [];
    const fc = feeConfigLookup[key];

    // Versement 1 (Octobre): ~90% paid, all completed
    if (vers.length >= 1 && i % 10 !== 0) {
      const dayOffset = ((i * 3) % 15) - 5;
      paymentValues.push({
        enrollmentId: enr.id,
        amount: vers[0].amount,
        paymentDate: offsetDate(vers[0].dueDate, dayOffset),
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: false,
        status: 'completed',
        notes: null,
      });
      pIdx++;
    }

    // Versement 2 (Janvier): ~60% paid, mix completed/pending
    if (vers.length >= 2 && i % 5 < 3) {
      const dayOffset = ((i * 5) % 15) - 3;
      const status = (i % 7 < 5) ? 'completed' : 'pending';
      paymentValues.push({
        enrollmentId: enr.id,
        amount: vers[1].amount,
        paymentDate: offsetDate(vers[1].dueDate, dayOffset),
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: false,
        status,
        notes: status === 'pending' ? 'En attente de confirmation' : null,
      });
      pIdx++;
    }

    // Versement 3 (Avril): ~5% paid, all pending
    if (vers.length >= 3 && i % 20 === 0) {
      paymentValues.push({
        enrollmentId: enr.id,
        amount: vers[2].amount,
        paymentDate: offsetDate(vers[2].dueDate, -5),
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: false,
        status: 'pending',
        notes: 'Paiement anticipé',
      });
      pIdx++;
    }

    // Book payment for ~70%
    if (i % 10 < 7 && fc) {
      paymentValues.push({
        enrollmentId: enr.id,
        amount: fc.bookFee,
        paymentDate: `2024-09-${String(3 + (i % 22)).padStart(2, '0')}`,
        paymentMethod: PAYMENT_METHODS[pIdx % PAYMENT_METHODS.length],
        isBookPayment: true,
        status: 'completed',
        notes: null,
      });
      pIdx++;
    }
  }

  // Batch insert in chunks
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < paymentValues.length; i += BATCH) {
    const batch = paymentValues.slice(i, i + BATCH);
    await db.insert(schema.payments).values(batch);
    total += batch.length;
  }
  console.log(`✓ ${total} paiements créés`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function resetAndSeed() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('Opération annulée.');
    await client.end();
    process.exit(0);
  }

  try {
    await clearAllTables();

    await seedUsers();
    await seedSchoolSettings();

    console.log('\nCréation de la structure scolaire...');
    const groups = await seedClassGroups();
    const classesList = await seedClasses(groups);
    const years = await seedSchoolYears();
    const feeConfigsData = await seedFeeConfigs(groups, years);
    const versementsData = await seedVersements(groups, years);

    const { records: studentRecords, meta: studentMeta } = await seedStudents();

    const { enrolled2023, enrolled2024 } = await seedEnrollments(
      studentRecords, studentMeta, classesList, years
    );

    await seedContacts(studentRecords, studentMeta);

    const { scholarshipStudentIds } = await seedScholarships(
      enrolled2024, classesList, versementsData, groups, years, studentRecords, studentMeta
    );

    await seedPayments(
      enrolled2023, enrolled2024, classesList, versementsData, feeConfigsData, years, scholarshipStudentIds
    );

    console.log('\n\x1b[32m✅ Seed terminé avec succès !\x1b[0m\n');
    console.log('Comptes de connexion :');
    console.log('  Admin:      admin@formel.school / admin123');
    console.log('  Secrétaire: secretary@formel.school / password123');
  } catch (err) {
    console.error('\n\x1b[31m❌ Erreur:\x1b[0m', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetAndSeed();

module.exports = {
  askConfirmation,
  clearAllTables,
  seedUsers,
};