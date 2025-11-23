const productService = require("../Services/productServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");
exports.getAll = (req, res, next) => {
  productService.listAllProducts(req.query, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
};

exports.getOne = (req, res, next) => {
  productService.getProductDetails(req.params.id, (err, result) => {
    if (err) return next(err);

    if (!result) {
      return next(
        new AppError(
          "PRODUCT_NOT_FOUND",
          errorCodes.PRODUCT_NOT_FOUND.message,
          errorCodes.PRODUCT_NOT_FOUND.httpStatus
        )
      );
    }

    res.json({ success: true, product: result });
  });
};

exports.create = (req, res, next) => {
  // If file uploaded, add image path to body
  if (req.file) {
    req.body.image_url = `/uploads/products/${req.file.filename}`;
  }

  // Ensure numeric fields are properly typed
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.stock) req.body.stock = Number(req.body.stock);

  productService.addProduct(req.body, (err, result) => {
    if (err) return next(err);
    res.status(201).json({ success: true, message: "Product created", result });
  });
};

exports.update = (req, res, next) => {
  // If file uploaded, add image path to body
  if (req.file) {
    req.body.image_url = `/uploads/products/${req.file.filename}`;
  }

  // Ensure numeric fields are properly typed
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.stock) req.body.stock = Number(req.body.stock);

  productService.editProduct(req.params.id, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ success: true, message: "Product updated", result });
  });
};
exports.remove = (req, res, next) => {
  productService.removeProduct(req.params.id, (err, result) => {
    if (err) return next(err);
    res.json({ success: true, message: "Product deleted", result });
  });
};
