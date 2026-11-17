function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.code === 11000) {
    return res.status(409).json({ message: "A product with this SKU already exists" });
  }
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map(item => item.message);
    return res.status(400).json({ message: "Validation failed", errors });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid data format" });
  }

  res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Internal server error"
  });
}

module.exports = errorHandler;
