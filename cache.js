const Redis = require('ioredis');
const redis = new Redis(); // Connects to default Redis server (localhost:6379)

// Function to set data in cache
async function setCache(key, value, expiry = 3600) {
  await redis.set(key, JSON.stringify(value), 'EX', expiry); // Expiry in seconds
}

// Function to get data from cache
async function getCache(key) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

module.exports = { setCache, getCache };
