// src/Repositories/reviewRepository.js
const db = require("../config/config");

/**
 * Add a new review
 */
function addReview(userId, orderId, productId, rating, comment, callback) {
  const sql = `
    INSERT INTO reviews (user_id, order_id, product_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sql,
    [userId, orderId, productId, rating, comment],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    }
  );
}

/**
 * Get all reviews for a specific product with user email
 */
function getReviewsByProduct(productId, callback) {
  const sql = `
    SELECT 
      r.id,
      r.user_id,
      r.rating,
      r.comment,
      r.created_at,
      u.email AS user_email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [productId], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

/**
 * Check if user can review a product (has delivered order with this product)
 * Returns array of eligible order IDs
 */
function canUserReview(userId, productId, callback) {
  const sql = `
    SELECT o.id as order_id
    FROM orders o
    INNER JOIN order_details od ON o.id = od.order_id
    WHERE o.user_id = ?
      AND od.product_id = ?
      AND o.status = 'Delivered'
      AND o.id NOT IN (
        SELECT r.order_id FROM reviews r 
        WHERE r.user_id = ? 
          AND r.product_id = ?
      )
    ORDER BY o.created_at DESC
    LIMIT 1
  `;

  db.query(sql, [userId, productId, userId, productId], (err, rows) => {
    if (err) {
      console.error("Error in canUserReview:", err);
      return callback(err);
    }
    callback(null, rows.length > 0 ? rows[0] : null);
  });
}

/**
 * Check if user has already reviewed a product for a specific order
 */
function hasUserReviewed(userId, productId, orderId, callback) {
  const sql = `
    SELECT id FROM reviews 
    WHERE user_id = ? AND product_id = ? AND order_id = ?
    LIMIT 1
  `;

  db.query(sql, [userId, productId, orderId], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.length > 0);
  });
}

/**
 * Get all reviews by a specific user
 */
function getReviewsByUser(userId, callback) {
  const sql = `
    SELECT 
      r.id,
      r.product_id,
      r.order_id,
      r.rating,
      r.comment,
      r.created_at,
      p.name AS product_name,
      p.image_url
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

/**
 * Get average rating for a product
 */
function getAverageRating(productId, callback) {
  const sql = `
    SELECT 
      AVG(rating) as avg_rating,
      COUNT(*) as review_count
    FROM reviews
    WHERE product_id = ?
  `;

  db.query(sql, [productId], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows[0]);
  });
}

module.exports = {
  addReview,
  getReviewsByProduct,
  canUserReview,
  hasUserReviewed,
  getReviewsByUser,
  getAverageRating,
};
