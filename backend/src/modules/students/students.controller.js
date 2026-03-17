const { asyncHandler } = require('../../lib/asyncHandler');
const studentsService = require('./students.service');

const listStudents = asyncHandler(async (req, res) => {
  const result = await studentsService.listStudents(req.query);
  res.json(result);
});

const createStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.createStudent(req.body);
  res.status(201).json(student);
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.getStudentById(req.params.id);
  res.json(student);
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.updateStudent(req.params.id, req.body);
  res.json(student);
});

module.exports = { listStudents, createStudent, getStudent, updateStudent };
