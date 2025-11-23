// src/Routes/reviewRoutes.js
const express = require("express");
const router = express.Router();
const reviewController = require("../Controllers/reviewController");
const requireAuth = require("../Middleware/requireAuth");

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Add a review for a product
 *     description: Allows a user to review a product from a delivered order
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: integer
 *                 example: 1
 *               order_id:
 *                 type: integer
 *                 example: 5
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Delicious cake!"
 *     responses:
 *       201:
 *         description: Review added successfully
 */
router.post("/", requireAuth, reviewController.addReview);

/**
 * @swagger
 * /api/reviews/product/{productId}:
 *   get:
 *     summary: Get all reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get("/product/:productId", reviewController.getReviewsByProduct);

/**
 * @swagger
 * /api/reviews/can-review/{productId}:
 *   get:
 *     summary: Check if user can review a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eligibility checked
 */
router.get(
  "/can-review/:productId",
  requireAuth,
  reviewController.canUserReview
);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get all reviews by the logged-in user
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: User reviews retrieved
 */
router.get("/my-reviews", requireAuth, reviewController.getMyReviews);

/**
 * @swagger
 * /api/reviews/rating/{productId}:
 *   get:
 *     summary: Get average rating for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Average rating retrieved
 */
router.get("/rating/:productId", reviewController.getAverageRating);

module.exports = router;
