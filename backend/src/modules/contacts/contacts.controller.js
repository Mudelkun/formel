const { asyncHandler } = require('../../lib/asyncHandler');
const contactsService = require('./contacts.service');

const listContacts = asyncHandler(async (req, res) => {
  const data = await contactsService.listContacts(req.params.id);
  res.json({ data });
});

const createContact = asyncHandler(async (req, res) => {
  const contact = await contactsService.createContact(req.params.id, req.body);
  res.status(201).json(contact);
});

const updateContact = asyncHandler(async (req, res) => {
  const contact = await contactsService.updateContact(req.params.id, req.params.contactId, req.body);
  res.json(contact);
});

const deleteContact = asyncHandler(async (req, res) => {
  await contactsService.deleteContact(req.params.id, req.params.contactId);
  res.status(204).send();
});

module.exports = { listContacts, createContact, updateContact, deleteContact };
