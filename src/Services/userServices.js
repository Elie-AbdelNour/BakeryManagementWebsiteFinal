// src/Services/userServices.js
const userRepo = require("../Repositories/userRepository");
const authRepo = require("../Repositories/authRepository"); // to fetch user by id
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");
const { sendDriverPromotionEmail } = require("../integrations/emailService");

// Create brand new driver
exports.createDriver = (email, callback) => {
  userRepo.createDriver(email, (err, result) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }

    const driver = { id: result.insertId, email, role: "driver" };

    // fire-and-forget email (don't block response)
    sendDriverPromotionEmail(email)
      .then(() => {
        console.log(`📧 Driver creation email sent to ${email}`);
      })
      .catch((e) => {
        console.error(
          "❌ Failed to send driver creation email:",
          e.message || e
        );
      });

    callback(null, driver);
  });
};

exports.getAllDrivers = (callback) => {
  userRepo.getAllDrivers((err, drivers) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, drivers);
  });
};

exports.getAllUsers = (callback) => {
  userRepo.getAllUsers((err, users) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }
    callback(null, users);
  });
};

exports.deleteDriver = (driverId, callback) => {
  // First unassign driver from all orders
  const orderRepo = require("../Repositories/orderRepository");

  orderRepo.unassignDriverFromOrders(driverId, (err, affectedOrders) => {
    if (err) {
      return callback(
        new AppError(
          "QUERY_FAILED",
          "Failed to unassign driver from orders.",
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }

    // Now delete the driver
    userRepo.deleteDriver(driverId, null, (err2, success) => {
      if (err2) {
        return callback(
          new AppError(
            "QUERY_FAILED",
            errorCodes.QUERY_FAILED.message,
            errorCodes.QUERY_FAILED.httpStatus
          )
        );
      }

      if (!success) {
        return callback(
          new AppError(
            "DRIVER_NOT_FOUND",
            "Driver not found or already deleted.",
            404
          )
        );
      }

      callback(null, {
        driverId,
        deleted: true,
        ordersAffected: affectedOrders,
      });
    });
  });
};
