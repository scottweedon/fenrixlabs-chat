const express = require('express');
const { listArtifactLibrary } = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /artifacts/library
 * Returns the authenticated user's disk-backed artifacts (Webpage/Document),
 * newest-created-first, cursor-paginated on `_id`.
 * Query: ?cursor=<id>&limit=<n>
 */
router.get('/library', async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const parsedLimit = limit != null ? parseInt(limit, 10) : undefined;

    const result = await listArtifactLibrary({
      userId: req.user.id,
      cursor: typeof cursor === 'string' && cursor !== '' ? cursor : undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
