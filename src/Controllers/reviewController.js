// src/Controllers/reviewController.js
const reviewService = require("../Services/reviewServices");
const { addReviewSchema } = require("../Validations/reviewValidations");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * @desc Add a review for a product
 * @route POST /api/reviews
 */
exports.addReview = (req, res, next) => {
  const { error } = addReviewSchema.validate(req.body);
  if (error) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        error.details[0].message,
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  const userId = req.user.id;
  const { product_id, order_id, rating, comment } = req.body;

  reviewService.addReview(
    userId,
    order_id,
    product_id,
    rating,
    comment || "",
    (err, review) => {
      if (err) return next(err);
      res.status(201).json({
        success: true,
        message: "Review added successfully.",
        review,
      });
    }
  );
};

/**
 * @desc Get all reviews for a product
 * @route GET /api/reviews/product/:productId
 */
exports.getReviewsByProduct = (req, res, next) => {
  const { productId } = req.params;

  reviewService.getReviewsByProduct(productId, (err, reviews) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully.",
      reviews,
    });
  });
};

/**
 * @desc Check if user can review a product
 * @route GET /api/reviews/can-review/:productId
 */
exports.canUserReview = (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  reviewService.canUserReview(userId, productId, (err, result) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: result.canReview
        ? "User can review this product."
        : "User cannot review this product.",
      ...result,
    });
  });
};

/**
 * @desc Get all reviews by the logged-in user
 * @route GET /api/reviews/my-reviews
 */
exports.getMyReviews = (req, res, next) => {
  const userId = req.user.id;

  reviewService.getReviewsByUser(userId, (err, reviews) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Your reviews retrieved successfully.",
      reviews,
    });
  });
};

/**
 * @desc Get average rating for a product
 * @route GET /api/reviews/rating/:productId
 */
exports.getAverageRating = (req, res, next) => {
  const { productId } = req.params;

  reviewService.getAverageRating(productId, (err, stats) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Rating retrieved successfully.",
      avgRating: parseFloat(stats.avg_rating) || 0,
      reviewCount: stats.review_count || 0,
    });
  });
};
