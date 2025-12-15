const redis = require('../redis');

// Default config if not found in Redis
const DEFAULT_CONFIG = {
  capacity: 10,
  refillRate: 1 // 1 token per second
};

// Helper to get config for a path
// In a real app, might cache this locally for short time to reduce Redis hits for config
async function getRateConfig(apiPath) {
  // Configs stored in Redis hash 'rate_limits_config'
  // Key: apiPath, Value: JSON string { capacity, refillRate }
  const configStr = await redis.hget('rate_limits_config', apiPath);
  if (configStr) {
    return JSON.parse(configStr);
  }
  return DEFAULT_CONFIG;
}

const rateLimiter = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    // Should be caught by auth middleware, but safety check
    return res.status(401).json({ message: 'User ID missing for rate limiting' });
  }

  const userId = req.user.id;
  const apiPath = req.path; // e.g., /api/orders
  
  // 1. Get configuration
  const config = await getRateConfig(apiPath);
  const { capacity, refillRate } = config;

  // 2. Keys for Redis
  const tokensKey = `rate:${userId}:${apiPath}:tokens`;
  const timestampKey = `rate:${userId}:${apiPath}:ts`;

  // 3. Current time in seconds (floating point for precision)
  const now = Date.now() / 1000;
  const requested = 1; // Cost per request

  try {
    // 4. Run Atomic Lua Script
    const result = await redis.consumeToken(
      tokensKey,
      timestampKey,
      refillRate,
      capacity,
      now,
      requested
    );

    const allowed = result[0];
    const remainingTokens = result[1];

    // 5. Set Headers
    res.set('X-RateLimit-Limit', capacity);
    res.set('X-RateLimit-Remaining', Math.floor(remainingTokens));
    
    if (allowed) {
      next();
    } else {
      // Calculate retry after
      // We know tokens < 1. We need 1 token.
      // Deficit = 1 - current_tokens (which effectively is what 'remainingTokens' represents if we didn't subtract cost)
      // Actually, if rejection, remainingTokens is the Amount currently there (which is < 1).
      // Time to get to 1 = (1 - remainingTokens) / refillRate
      const tokensNeeded = 1 - remainingTokens;
      const retryAfter = Math.ceil(tokensNeeded / refillRate);
      
      res.set('Retry-After', retryAfter);
      res.status(429).json({ 
        message: 'Too Many Requests',
        retryAfter
      });
      
      // Log rejection (simple console for now as per requirements)
      console.log(`[RateLimit] REJECT User:${userId} Path:${apiPath} Tokens:${remainingTokens}`);
    }
  } catch (err) {
    console.error('Rate Limiter Error:', err);
    // Fail open or closed? Usually fail open for Gateway availability, but strict limiting requires fail closed.
    // Let's return 500 for safety.
    res.status(500).json({ message: 'Internal Server Error during Rate Check' });
  }
};

module.exports = rateLimiter;
