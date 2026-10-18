// src/middleware/limiters.js
import rateLimit from 'express-rate-limit';

// Counts attempts toward the limit, but forgives successful logins.
// A user who logs in fine a dozen times isn't penalized.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Every registration counts. Stops scripted account spam.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Try again later.' },
});