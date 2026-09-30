import rateLimit from 'express-rate-limit';

const MINUTE = 60 * 1000;

// ponytail: in-memory store, per process; move to a shared store if the API runs more than one instance.
const limiter = (windowMs, limit, message, options = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message },
  ...options,
});

export const loginLimiter = limiter(15 * MINUTE, 10, 'Too many login attempts, try again later', { skipSuccessfulRequests: true });

export const submissionLimiter = () => limiter(10 * MINUTE, 5, 'Too many submissions, try again later');
