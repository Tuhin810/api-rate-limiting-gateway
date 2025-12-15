const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /auth/login - Issue JWT
router.post('/login', (req, res) => {
  const { username } = req.body;
  // Simplified login, accepts any username
  if (!username) {
    return res.status(400).json({ message: 'Username required' });
  }

  const user = { id: username, username };
  const token = jwt.sign(user, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1h' });

  res.json({ token });
});

module.exports = router;
