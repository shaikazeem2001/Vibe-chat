const rateLimit = require("express-rate-limit");

/**
 * Factory to create a rate limiter with a custom message.
 * All limits use in-memory store (express-rate-limit default).
 * Swap to @upstash/ratelimit for multi-instance / edge deployments.
 */
function createLimiter({ max, windowMs, label }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Send RateLimit-* headers
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil(
        (req.rateLimit.resetTime - Date.now()) / 1000
      );
      res.status(429).json({
        message: `Too many ${label} requests. Retry in ${retryAfter}s`,
        retryAfter,
      });
    },
  });
}

// 5 auth attempts per minute (login / forgot-password)
const authLimiter = createLimiter({
  max: 5,
  windowMs: 60 * 1000,
  label: "auth",
});

// 30 search requests per minute
const searchLimiter = createLimiter({
  max: 30,
  windowMs: 60 * 1000,
  label: "search",
});

// 60 messages per minute
const messageLimiter = createLimiter({
  max: 60,
  windowMs: 60 * 1000,
  label: "message",
});

// 10 uploads per minute
const uploadLimiter = createLimiter({
  max: 10,
  windowMs: 60 * 1000,
  label: "upload",
});

module.exports = {
  authLimiter,
  searchLimiter,
  messageLimiter,
  uploadLimiter,
};
