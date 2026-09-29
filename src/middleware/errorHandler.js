// backend-api/src/middleware/errorHandler.js
export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const statusFor = (err, req, res) => {
  if (err.status) return err.status;
  if (err.code === 'P2002') return 409;
  if (err.code === 'P2025') return 404;
  if (err.code === 'P2003') return req.method === 'DELETE' ? 409 : 400;
  return res.statusCode === 200 ? 500 : res.statusCode;
};

const prismaMessage = (err, req) => {
  if (err.status) return err.message;
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    return `A record with that ${Array.isArray(target) ? target.join(', ') : target ?? 'value'} already exists`;
  }
  if (err.code === 'P2025') return 'Not found';
  if (err.code === 'P2003') {
    return req.method === 'DELETE'
      ? 'Cannot delete while projects still reference it'
      : 'Referenced record does not exist';
  }
  return err.message;
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = statusFor(err, req, res);

  // Log error details for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode);
  res.json({
    message: prismaMessage(err, req),
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};
