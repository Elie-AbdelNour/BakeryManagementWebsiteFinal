const authService = require("../Services/authServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * Request OTP (send email)
 */
exports.requestOtp = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(
      new AppError(
        "EMAIL_REQUIRED",
        errorCodes.EMAIL_REQUIRED.message,
        errorCodes.EMAIL_REQUIRED.httpStatus
      )
    );
  }

  authService.sendLoginOtp(email, (err, result, otp) => {
    if (err) return next(err);

    // ✅ Show OTP in console for testing
    if (otp) {
      console.log(`📩 OTP for ${email}: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  });
};

/**
 * Verify OTP and log in user
 */
exports.loginWithOtp = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        "Email and OTP are required",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  authService.verifyLoginOtp(email, otp, (err, result) => {
    if (err) return next(err);

    // Set JWT cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  });
};

/**
 * Logout user (clear cookie)
 */
exports.logout = (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
