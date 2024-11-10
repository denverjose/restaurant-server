const validatePagination = (req, res, next) => {
  const { page = 1, limit = 3 } = req.query;

  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res
      .status(400)
      .json({ error: "Page and limit must be positive integers" });
  }

  next();
};

module.exports = validatePagination;
