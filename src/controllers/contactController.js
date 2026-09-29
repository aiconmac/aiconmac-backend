// backend-api/src/controllers/contactController.js
import * as contactService from '../services/contactService.js';

export const getContactSubmissions = async (req, res, next) => {
  try {
    const filter = {
      isRead: req.query.isRead ? (req.query.isRead === 'true') : undefined,
    };
    const submissions = await contactService.getAllContactSubmissions(filter);
    res.status(200).json(submissions);
  } catch (error) {
    next(error);
  }
};

export const getContactSubmission = async (req, res, next) => {
  try {
    const submission = await contactService.getContactSubmissionById(req.params.id);
    if (!submission) {
      res.status(404);
      throw new Error('Contact submission not found');
    }
    res.status(200).json(submission);
  } catch (error) {
    next(error);
  }
};

export const createContactSubmission = async (req, res, next) => {
  try {
    const submission = await contactService.createContactSubmission(req.body, req.files);
    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
};

export const updateContactSubmission = async (req, res, next) => {
  try {
    const submission = await contactService.updateContactSubmission(req.params.id, req.body);
    res.status(200).json(submission);
  } catch (error) {
    next(error);
  }
};

export const deleteContactSubmission = async (req, res, next) => {
  try {
    const result = await contactService.deleteContactSubmission(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};