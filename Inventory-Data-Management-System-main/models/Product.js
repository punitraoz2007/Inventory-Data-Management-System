const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    minlength: [2, "Name must contain at least 2 characters"],
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"],
    default: ""
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    maxlength: 60
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  stock: {
    type: Number,
    required: [true, "Stock quantity is required"],
    min: [0, "Stock cannot be negative"],
    validate: {
      validator: Number.isInteger,
      message: "Stock must be a whole number"
    },
    default: 0
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
