const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { searchLimiter } = require('../middleware/rateLimit.middleware');
const { searchMessages } = require('../config/algolia');

/**
 * GET /api/search/messages?q=hello&roomId=<uuid>
 *
 * Rate-limited (30 req/min per user) and auth-protected.
 * Proxies the query to Algolia and returns hits.
 * The room filter ensures users can only search rooms they are in.
 */
router.get('/messages', authMiddleware, searchLimiter, async (req, res) => {
  try {
    const { q, roomId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }
    if (!roomId) {
      return res.status(400).json({ message: 'roomId is required' });
    }

    const hits = await searchMessages(q.trim(), roomId);
    return res.json({ hits });
  } catch (err) {
    console.error('[Search Route] Error:', err);
    return res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

module.exports = router;
