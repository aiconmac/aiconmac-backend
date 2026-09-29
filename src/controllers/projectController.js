// backend-api/src/controllers/projectController.js
import * as projectService from '../services/projectService.js';

export const getProjects = async (req, res, next) => {
  try {
    const requested = req.query.isPublished ? (req.query.isPublished === 'true') : undefined;
    const filter = {
      category: req.query.category,
      isPublished: req.user ? requested : true,
    };
    const projects = await projectService.getAllProjects(filter);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    if (!project || (!project.isPublished && !req.user)) {
      res.status(404);
      throw new Error('Project not found');
    }
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      res.status(400);
      throw new Error('At least one image is required for a project');
    }
    const project = await projectService.createProject(req.body, req.files);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.files);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};