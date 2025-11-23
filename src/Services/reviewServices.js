// src/Services/reviewServices.js
const reviewRepo = require("../Repositories/reviewRepository");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * Add a review for a product
 */
exports.addReview = (userId, orderId, productId, rating, comment, callback) => {
  // First check if user can review this product (has delivered order)
  reviewRepo.canUserReview(userId, productId, (err, eligibleOrder) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }

    if (!eligibleOrder) {
      return callback(
        new AppError(
          "FORBIDDEN",
          "You can only review products from delivered orders.",
          errorCodes.FORBIDDEN.httpStatus
        )
      );
    }

    // Verify the provided order_id matches an eligible order
    if (eligibleOrder.order_id !== orderId) {
      return callback(
        new AppError(
          "FORBIDDEN",
          "Invalid order ID for this review.",
          errorCodes.FORBIDDEN.httpStatus
        )
      );
    }

    // Check if already reviewed
    reviewRepo.hasUserReviewed(
      userId,
      productId,
      orderId,
      (err2, hasReviewed) => {
        if (err2) {
          return callback(
            new AppError(
              "QUERY_FAILED",
              errorCodes.QUERY_FAILED.message,
              errorCodes.QUERY_FAILED.httpStatus
            )
          );
        }

        if (hasReviewed) {
          return callback(
            new AppError(
              "CONFLICT",
              "You have already reviewed this product for this order.",
              409
            )
          );
        }

        // Add the review
        reviewRepo.addReview(
          userId,
          orderId,
          productId,
          rating,
          comment,
          (err3, result) => {
            if (err3) {
              return callback(
                new AppError(
                  "QUERY_FAILED",
                  errorCodes.QUERY_FAILED.message,
                  errorCodes.QUERY_FAILED.httpStatus
                )
              );
            }

            callback(null, {
              id: result.insertId,
              user_id: userId,
              order_id: orderId,
              product_id: productId,
              rating,
              comment,
            });
          }
        );
      }
    );
  });
};

/**
 * Get all reviews for a product
 */
exports.getReviewsByProduct = (productId, callback) => {
  reviewRepo.getReviewsByProduct(productId, (err, reviews) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, reviews);
  });
};

/**
 * Check if user can review a product
 */
exports.canUserReview = (userId, productId, callback) => {
  reviewRepo.canUserReview(userId, productId, (err, eligibleOrder) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, {
      canReview: !!eligibleOrder,
      orderId: eligibleOrder?.order_id,
    });
  });
};

/**
 * Get all reviews by a user
 */
exports.getReviewsByUser = (userId, callback) => {
  reviewRepo.getReviewsByUser(userId, (err, reviews) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, reviews);
  });
};

/**
 * Get average rating for a product
 */
exports.getAverageRating = (productId, callback) => {
  reviewRepo.getAverageRating(productId, (err, stats) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, stats);
  });
};
