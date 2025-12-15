const express = require('express');
const router = express.Router();
const redis = require('../redis');

// GET /admin/config - Get all rate limit configs
router.get('/config', async (req, res) => {
  try {
    const allConfigs = await redis.hgetall('rate_limits_config');
    // Redis returns object { path: "{\"capacity\":...}", ... }
    const parsed = {};
    for (const [key, value] of Object.entries(allConfigs)) {
      parsed[key] = JSON.parse(value);
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/config - Update config for a path
router.post('/config', async (req, res) => {
  const { path, capacity, refillRate } = req.body;
  if (!path || !capacity || !refillRate) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const config = { capacity: Number(capacity), refillRate: Number(refillRate) };
  
  try {
    await redis.hset('rate_limits_config', path, JSON.stringify(config));
    res.json({ message: 'Config updated', config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
