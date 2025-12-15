const Redis = require('ioredis');

// Connect to Redis using environment variable or default to localhost
const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Lua script for Token Bucket Algorithm
// KEYS[1]: tokens_key (rate:{userId}:{apiPath}:tokens)
// KEYS[2]: timestamp_key (rate:{userId}:{apiPath}:ts)
// ARGV[1]: refill_rate (tokens per second)
// ARGV[2]: capacity (max tokens)
// ARGV[3]: current_time (seconds)
// ARGV[4]: requested_tokens (cost)

const luaScript = `
local tokens_key = KEYS[1]
local timestamp_key = KEYS[2]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local fill_time = capacity / rate
local ttl = math.floor(fill_time * 2)

local last_tokens = tonumber(redis.call("get", tokens_key))
if last_tokens == nil then
  last_tokens = capacity
end

local last_refreshed = tonumber(redis.call("get", timestamp_key))
if last_refreshed == nil then
  last_refreshed = 0
end

local delta = math.max(0, now - last_refreshed)
local filled_tokens = math.min(capacity, last_tokens + (delta * rate))
local allowed = 0
local new_tokens = filled_tokens

if filled_tokens >= requested then
  allowed = 1
  new_tokens = filled_tokens - requested
end

if allowed == 1 then
    redis.call("set", tokens_key, new_tokens, "EX", ttl)
    redis.call("set", timestamp_key, now, "EX", ttl)
end

return { allowed, new_tokens }
`;

// Define custom command
redis.defineCommand('consumeToken', {
  numberOfKeys: 2,
  lua: luaScript
});

module.exports = redis;
