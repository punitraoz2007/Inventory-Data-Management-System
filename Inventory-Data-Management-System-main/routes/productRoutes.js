const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");

router.get("/reports/low-stock", controller.lowStockReport);
router.get("/reports/category-summary", controller.categorySummary);
router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);
router.put("/:id", controller.updateProduct);
router.patch("/:id/stock", controller.adjustStock);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
