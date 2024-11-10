const express = require("express");
const {
  isBlankValidator,
  paginationValidator,
} = require("../middleware/validator");
const {
  createRestaurant,
  addReview,
  getRestaurants,
} = require("../controllers/restaurantController");

const router = express.Router();

router.post("/", isBlankValidator, createRestaurant);

router.get("/", paginationValidator, getRestaurants);

router.post("/:id/review", isBlankValidator, addReview);

module.exports = router;
