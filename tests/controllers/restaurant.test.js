const {
  createRestaurant,
  addReview,
  getRestaurants,
} = require("../../controllers/restaurantController");
const Restaurant = require("../../models/Restaurant");
const Review = require("../../models/Review");
const redisClient = require("../../config/redisClient");
const getOrSetCache = require("../../utils/cache");

jest.mock("../../config/redisClient", () => ({
  keys: jest.fn(),
  del: jest.fn(),
}));
jest.mock("../../utils/cache", () => jest.fn());
jest.mock("../../models/Restaurant");
jest.mock("../../models/Review");

// restaurantController.test.js
describe("Restaurant Controller Tests", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("createRestaurant", () => {
    it("should return 400 if the restaurant already exists", async () => {
      req.body.name = "Existing Restaurant";
      Restaurant.findOne.mockResolvedValueOnce({ name: "Existing Restaurant" });

      await createRestaurant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Restaurant already exists",
      });
    });

    it("should create a restaurant and clear related cache", async () => {
      req.body.name = "New Restaurant";
      Restaurant.findOne.mockResolvedValueOnce(null);
      Restaurant.prototype.save.mockResolvedValueOnce({});
      redisClient.keys.mockResolvedValueOnce([
        "restaurants:1",
        "restaurants:2",
      ]);
      redisClient.del.mockResolvedValueOnce();

      await createRestaurant(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant created successfully",
        restaurant: expect.any(Object),
      });
      expect(redisClient.del).toHaveBeenCalled();
    });

    it("should save the restaurant and return the saved instance", async () => {
      const restaurantData = {
        _id: "restaurantId123",
        name: "Test Restaurant",
      };
      Restaurant.prototype.save = jest
        .fn()
        .mockResolvedValueOnce(restaurantData);

      const restaurant = new Restaurant({ name: "Test Restaurant" });
      const savedRestaurant = await restaurant.save();

      expect(savedRestaurant).toEqual(restaurantData);
      Restaurant.prototype.save.mockRestore();
    });

    it("should return 500 if there is a server error", async () => {
      req.body.name = "Test Restaurant";
      Restaurant.findOne.mockRejectedValueOnce(new Error("Database error"));

      await createRestaurant(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to create restaurant",
        details: "Database error",
      });
    });
  });

  describe("addReview", () => {
    it("should return 404 if the restaurant is not found", async () => {
      req.params.id = "nonexistentRestaurantId";
      Restaurant.findById.mockResolvedValueOnce(null);

      await addReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Restaurant not found" });
    });

    it("should successfully add a review and clear related cache", async () => {
      req.params.id = "existingRestaurantId";
      req.body.review = "Great food!";
      const restaurant = {
        _id: req.params.id,
        reviews: [],
        save: jest.fn().mockImplementation(() => {
          restaurant.reviews.push(newReview);
          return Promise.resolve();
        }),
      };
      const newReview = {
        _id: "reviewId123",
        review: req.body.review,
        restaurantId: req.params.id,
      };

      Restaurant.findById.mockResolvedValueOnce(restaurant);
      Review.prototype.save.mockResolvedValueOnce(newReview);
      redisClient.keys.mockResolvedValueOnce([
        "restaurants:1",
        "restaurants:2",
      ]);
      redisClient.del.mockResolvedValueOnce();

      await addReview(req, res);

      expect(restaurant.reviews).toContainEqual(newReview);
      expect(restaurant.save).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Review added successfully",
        review: expect.any(Object),
      });
    });

    it("should save the review and return the saved instance", async () => {
      const reviewData = {
        restaurantId: "restaurantId123",
        review: "Test Review",
      };
      Review.prototype.save = jest.fn().mockResolvedValueOnce(reviewData);

      const review = new Review(reviewData);
      const savedReview = await review.save();

      expect(savedReview).toEqual(reviewData);
      Review.prototype.save.mockRestore();
    });

    it("should return 500 if there is a server error", async () => {
      req.params.id = "existingRestaurantId";
      req.body.review = "Great food!";
      Restaurant.findById.mockRejectedValueOnce(new Error("Database error"));

      await addReview(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to add review",
        details: "Database error",
      });
    });
  });
  describe("addReview", () => {
    it("should return restaurants with pagination and cache", async () => {
      const restaurantsData = [
        { _id: "1", name: "Restaurant A", review: [] },
        { _id: "2", name: "Restaurant B", review: [] },
      ];
      const paginationData = { page: 1, limit: 3, totalPages: 1 };

      const cacheKey = `restaurants:page=1:limit=3:filter=`;

      // Mock cache fetching function (getOrSetCache)
      getOrSetCache.mockResolvedValueOnce({
        restaurants: restaurantsData,
        pagination: paginationData,
      });

      req.query.page = "1";
      req.query.limit = "3";
      req.query.name = "";

      await getRestaurants(req, res);

      // Ensure caching behavior
      expect(getOrSetCache).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Function)
      );

      // Check if the response has been sent correctly
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        restaurants: restaurantsData,
        pagination: paginationData,
      });
    });

    it("should return 500 if there is a server error", async () => {
      const errorMessage = "Database error";
      getOrSetCache.mockRejectedValueOnce(new Error(errorMessage));

      await getRestaurants(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch restaurants",
        details: errorMessage,
      });
    });

    it("should query and return filtered restaurants by name", async () => {
      const restaurantsData = [
        { _id: "1", name: "Restaurant A" },
        { _id: "2", name: "Restaurant B" },
      ];
      const paginationData = { page: 1, limit: 3, totalPages: 1 };

      // Mock cache fetching function (getOrSetCache)
      getOrSetCache.mockImplementationOnce((cacheKey, cb) => {
        // Apply filter based on the name query
        const { name } = req.query;
        const filteredRestaurants = restaurantsData.filter((restaurant) =>
          restaurant.name.toLowerCase().includes(name.toLowerCase())
        );

        return Promise.resolve({
          restaurants: filteredRestaurants,
          pagination: paginationData,
        });
      });

      req.query.page = "1";
      req.query.limit = "3";
      req.query.name = "Restaurant A"; // Filtering by name

      await getRestaurants(req, res);

      const cacheKey = `restaurants:page=1:limit=3:filter=restaurant a`; // The name is filtered to lowercase

      // Ensure the cache function was called with the correct cache key and function
      expect(getOrSetCache).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Function)
      );

      // Check that only Restaurant A is returned
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        restaurants: [{ _id: "1", name: "Restaurant A" }],
        pagination: paginationData,
      });
    });

    it("should handle empty results gracefully", async () => {
      const restaurantsData = [];
      const paginationData = { page: 1, limit: 3, totalPages: 1 };

      // Mock cache fetching function (getOrSetCache)
      getOrSetCache.mockResolvedValueOnce({
        restaurants: restaurantsData,
        pagination: paginationData,
      });

      req.query.page = "1";
      req.query.limit = "3";
      req.query.name = "";

      await getRestaurants(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        restaurants: [],
        pagination: paginationData,
      });
    });
  });
});
