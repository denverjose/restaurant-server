const isBlankValidator = (req, res, next) => {
  const key = Object.keys(req.body)[0];
  const value = req.body[key];

  if (!value || value.trim() === "") {
    return res.status(400).json({ error: `Restaurant ${key} cannot be blank` });
  }

  next();
};

const paginationValidator = (req, res, next) => {
  const { page = 1, limit = 3 } = req.query;

  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res
      .status(400)
      .json({ error: "Page and limit must be positive integers" });
  }

  next();
};

module.exports = {
  isBlankValidator,
  paginationValidator,
};
