const express = require('express');
const cors = require('cors');
const verifyToken = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');
const proxy = require('./proxy');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public Routes
app.use('/auth', authRoutes);

// Protected Admin Routes (Using generic auth for now)
app.use('/admin', verifyToken, adminRoutes);

// Protected API Routes (Rate Limited & Proxied)
// Matches any request starting with /api
app.use('/api', verifyToken, rateLimiter, proxy);

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
