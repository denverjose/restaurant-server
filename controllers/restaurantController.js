const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const redisClient = require("../config/redisClient");
const getOrSetCache = require("../utils/cache");

const createRestaurant = async (req, res) => {
  const { name } = req.body;

  try {
    const existingRestaurant = await Restaurant.findOne({ name });
    if (existingRestaurant) {
      return res.status(400).json({ error: "Restaurant already exists" });
    }

    const restaurant = new Restaurant({ name });
    await restaurant.save();

    const cachePattern = "restaurants:*";
    const keys = await redisClient.keys(cachePattern);

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redisClient.del(key)));
      console.log("Deleted related cache keys after creating a new restaurant");
    }
    res
      .status(200)
      .json({ message: "Restaurant created successfully", restaurant });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create restaurant", details: error.message });
  }
};

const addReview = async (req, res) => {
  const { review } = req.body;
  const restaurantId = req.params.id;

  try {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const newReview = new Review({
      review,
      restaurantId,
    });

    await newReview.save();

    restaurant.reviews.push(newReview);
    await restaurant.save();

    const cachePattern = `restaurants:*`;

    const keys = await redisClient.keys(cachePattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cleared cache for keys: ${keys}`);
    }

    res
      .status(200)
      .json({ message: "Review added successfully", review: newReview });
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ error: "Failed to add review", details: error.message });
  }
};

const getRestaurants = async (req, res) => {
  const { name = "", page = 1, limit = 3 } = req.query;
  const cacheKey = `restaurants:page=${page}:limit=${limit}:filter=${name.toLowerCase()}`;

  try {
    const restaurants = await getOrSetCache(cacheKey, async () => {
      const filter = name ? { name: { $regex: name, $options: "i" } } : {};

      const totalRestaurants = await Restaurant.countDocuments(filter);

      const restaurants = await Restaurant.find(filter)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("reviews");

      console.log("Fetching data from MongoDB with populated reviews");

      const totalPages = Math.ceil(totalRestaurants / limit);

      return {
        restaurants,
        pagination: { page, limit, totalPages },
      };
    });

    return res.status(200).json(restaurants);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch restaurants", details: error.message });
  }
};

module.exports = {
  createRestaurant,
  addReview,
  getRestaurants,
};
