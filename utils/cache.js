const redisClient = require("../config/redisClient");

async function getOrSetCache(cacheKey, cb) {
  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("Serving from Redis cache");
      return JSON.parse(cachedData);
    }

    const freshData = await cb();
    await redisClient.setEx(
      cacheKey,
      process.env.DEFAULT_EXPIRATION || 3600,
      JSON.stringify(freshData)
    );

    return freshData;
  } catch (error) {
    console.error("Error in getOrSetCache:", error);
    throw error;
  }
}

module.exports = getOrSetCache;
