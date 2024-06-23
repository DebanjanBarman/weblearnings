const Course = require("../models/courseModel");
const User = require("../models/userModel");
const Purchase = require("../models/purchaseModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  res.status(201).json({
    message: "success",
    data: {
      newUser,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No User found with that id", 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body);

  if (!user) {
    return next(new AppError("No User found with that id", 404));
  }

  res.status(202).json({
    message: "success",
    data: {
      user,
    },
  });
});
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("No User found with that id", 404));
  }

  res.status(204).json({
    message: "success",
    data: null,
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    message: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1 Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates", 400));
  }

  //2	If not Update user document
  const filteredBody = filterObj(req.body, "name", "email");

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  //3 send the updated data to the client
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  user.role = undefined;

  res.status(200).json({
    message: "success",
    data: {
      user,
    },
  });
});

exports.getMyPurchasedCourses = catchAsync(async (req, res, next) => {
  // 1 Find all purchases
  const purchases = await Purchase.find({ user: req.user.id });

  // 2 Find all courses with the returned ID's
  const courseIDs = purchases.map((el) => el.course);
  const courses = await Course.find({ _id: { $in: courseIDs } }).select(
    "id title author courseImage lessonNo"
  );
  res.status(200).json({
    status: "success",
    data: {
      courses,
    },
  });
});

exports.getMyCreatedCourses = catchAsync(async (req, res, next) => {
  // 1 Find all Courses
  const courses = await Course.find({ instructor: req.user.id }).select(
    "id title author courseImage published"
  );

  res.status(200).json({
    status: "success",
    data: {
      courses,
    },
  });
});

exports.getMyCreatedCourse = catchAsync(async (req, res, next) => {
  const requestedCourse = req.params.id;
  let course;
  // 1 Find all Courses
  const courses = await Course.find({ instructor: req.user.id }).select("id");
  const courseIDs = courses.map((el) => el.id);

  if (courseIDs.includes(requestedCourse)) {
    course = await Course.findById(requestedCourse);
    if (!course) {
      return next(new AppError("No Course found with that id", 404));
    }
  } else {
    return next(
      new AppError("The following course doesn't belong to you", 401)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      course,
    },
  });
});

exports.updateMyCreatedCourse = catchAsync(async (req, res, next) => {
  const requestedCourse = req.params.id;
  let course;
  // 1 Find all Courses
  let isAuthorValid = await Course.findById(requestedCourse)
    .where({ instructor: req.user.id })
    .select("id");

  if (isAuthorValid.id) {
    let payload = req.body;

    course = await Course.findByIdAndUpdate(requestedCourse, payload);
    if (course.introVideo==="") {
      await Course.findByIdAndUpdate(requestedCourse, { published: false });
    }
    if (!course) {
      return next(new AppError("Course update failed", 404));
    }
  } else {
    return next(
      new AppError("The following course doesn't belong to you", 401)
    );
  }
  res.status(200).json({
    status: "success",
    data: {
      course,
    },
  });
});

exports.deleteMyCreatedCourse = catchAsync(async (req, res, next) => {
  const requestedCourse = req.params.id;

  // 1 Find all Courses
  const courses = await Course.find({ instructor: req.user.id }).select("id");
  const courseIDs = courses.map((el) => el.id);

  if (courseIDs.includes(requestedCourse)) {
    await Course.findByIdAndDelete(requestedCourse);
  } else {
    return next(
      new AppError("The following course doesn't belong to you", 401)
    );
  }

  res.status(204).json({
    status: "success",
    data: {
      courses,
    },
  });
});
