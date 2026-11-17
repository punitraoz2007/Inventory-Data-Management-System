const mongoose = require("mongoose");
const Product = require("../models/Product");

const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) { next(error); }
};

const getProducts = async (req, res, next) => {
  try {
    const {
      category, search, minPrice, maxPrice,
      sortBy = "createdAt", order = "desc",
      page = 1, limit = 10
    } = req.query;

    const filter = {};
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: new RegExp(safeSearch, "i") },
        { description: new RegExp(safeSearch, "i") }
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
      if (Object.values(filter.price).some(Number.isNaN)) {
        return res.status(400).json({ message: "minPrice and maxPrice must be numbers" });
      }
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const allowedSortFields = ["name", "price", "stock", "createdAt", "category"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter)
    ]);

    res.json({
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      products
    });
  } catch (error) { next(error); }
};

const getProductById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id, req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product updated successfully", product });
  } catch (error) { next(error); }
};

const deleteProduct = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) { next(error); }
};

// Atomic stock update prevents two simultaneous requests from overselling stock.
const adjustStock = async (req, res, next) => {
  try {
    const { quantity, operation } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "quantity must be a positive whole number" });
    }
    if (!["restock", "sale"].includes(operation)) {
      return res.status(400).json({ message: "operation must be restock or sale" });
    }

    const condition = { _id: req.params.id };
    const update = operation === "restock"
      ? { $inc: { stock: quantity } }
      : { $inc: { stock: -quantity } };

    if (operation === "sale") condition.stock = { $gte: quantity };

    const product = await Product.findOneAndUpdate(condition, update, {
      new: true, runValidators: true
    });

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ message: "Product not found" });
      return res.status(400).json({ message: "Insufficient stock for this sale" });
    }
    res.json({ message: `Stock ${operation} successful`, product });
  } catch (error) { next(error); }
};

const lowStockReport = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold ?? process.env.LOW_STOCK_THRESHOLD ?? 10);
    if (!Number.isFinite(threshold) || threshold < 0) {
      return res.status(400).json({ message: "threshold must be a non-negative number" });
    }
    const products = await Product.find({ stock: { $lte: threshold } }).sort({ stock: 1 });
    res.json({ threshold, count: products.length, products });
  } catch (error) { next(error); }
};

const categorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
          totalUnits: { $sum: "$stock" },
          inventoryValue: { $sum: { $multiply: ["$price", "$stock"] } },
          averagePrice: { $avg: "$price" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0, category: "$_id", productCount: 1,
          totalUnits: 1, inventoryValue: { $round: ["$inventoryValue", 2] },
          averagePrice: { $round: ["$averagePrice", 2] }
        }
      }
    ]);
    res.json(summary);
  } catch (error) { next(error); }
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  createProduct, getProducts, getProductById, updateProduct,
  deleteProduct, adjustStock, lowStockReport, categorySummary
};
