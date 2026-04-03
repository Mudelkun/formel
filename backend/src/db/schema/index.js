const { students } = require('./students');
const { contacts } = require('./contacts');
const { studentDocuments } = require('./studentDocuments');
const { classGroups } = require('./classGroups');
const { classes } = require('./classes');
const { schoolYears } = require('./schoolYears');
const { enrollments } = require('./enrollments');
const { feeConfigs } = require('./feeConfigs');
const { versements } = require('./versements');
const { payments } = require('./payments');
const { scholarships } = require('./scholarships');
const { users } = require('./users');
const { paymentDocuments } = require('./paymentDocuments');
const { schoolSettings } = require('./schoolSettings');
const { auditLogs } = require('./auditLogs');
const { refreshTokens } = require('./refreshTokens');
const { messageLogs } = require('./messageLogs');
const { verificationCodes } = require('./verificationCodes');
const { trustedDevices } = require('./trustedDevices');

module.exports = {
  students,
  contacts,
  studentDocuments,
  classGroups,
  classes,
  schoolYears,
  enrollments,
  feeConfigs,
  versements,
  payments,
  scholarships,
  users,
  paymentDocuments,
  schoolSettings,
  auditLogs,
  refreshTokens,
  messageLogs,
  verificationCodes,
  trustedDevices,
};
