const { promisify } = require("util");
const crypto = require("crypto");

const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //    1 Check if email and password exists

  if (!email || !password) {
    return next(new AppError("Please provide Email and password ", 400));
  }

  //    2 Check if user exists && password is correct

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password ", 401));
  }

  //    3 If everything is ok send the JWT

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1 Get the token and check if it's exists
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in, Please login to continue", 401)
    );
  }

  //2 Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3 Check if user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(new AppError("The user no longer exists", 401));
  }

  //4 Check if user changed password after the Token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "You recently changed your password Please log in with new password",
        401
      )
    );
  }

  //Grant access to protected route
  req.user = freshUser;
  next();
});

exports.isSubscribed = catchAsync(async (req, res, next) => {
  if (req.user.subscription_expire_at >= Date.now()) {
    next();
  } else {
    return next(
      new AppError("Your plan has expired please upgrade to continue", 403)
    );
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //	roles ['admin', 'author', 'moderator']

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You are not allowed to perform this action", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1 Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }

  //2 Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3 Send it to user's email
  const resetURL = `${process.env.PASSWORD_RESET_URL}${resetToken}`;

  const message = `
Forgot Your password? use the link to reset your password

${resetURL}

If you didn't forgot your password please ignore the mail`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token valid for 3 min",
      message,
    });
    res.status(200).json({
      status: "success",
      message: "Email send successfully please check your mail",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    console.log(err);

    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the E-mail try again later", 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //	1) Get the user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //	2) If token has not expired, and there is a user, set the new password

  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }

  //	3) Update changedPasswordAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) Log the user in/ Send the JWT
  // createSendToken(user, 200, res)

  res.status(200).json({
    status: "success",
    message: "Password reset successful please log in",
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from the collection
  const user = await User.findById(req.user.id).select("+password");

  //2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Password is incorrect", 401));
  }

  //3) If so then update the password, and passwordChangedAt
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) Log user in, send JWT
  createSendToken(user, 200, res);
});
