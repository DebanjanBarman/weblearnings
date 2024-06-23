const Course = require("./../models/courseModel");
const Purchase = require("../models/purchaseModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllCourses = catchAsync(async (req, res, next) => {
  //Build query
  // 1) Filtering
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 2) Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  let query = Course.find(JSON.parse(queryStr)).where({
    published: true,
  });

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("title author courseImage price language");
  }
  const courses = await query;

  res.status(200).json({
    message: "success",
    data: {
      courses,
    },
  });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  let course = await Course.findById(req.params.id);
  let intro;

  intro = course.modules[0].clips[0].playerUrl;

  if (course.published === false && course.instructor !== req.user.id) {
    return next(new AppError("No Course found with that id", 404));
  }

  // 1 Find all purchases
  const purchases = await Purchase.find({ user: req.user.id });

  const courseIDs = purchases.map((el) => el.course.id);

  let isPurchased;

  // Check if user has purchased the course
  isPurchased = courseIDs.includes(course.id);

  if (!isPurchased) {
    course.modules = undefined;
  }
  if (!course) {
    return next(new AppError("No Course found with that id", 404));
  }
  course.introVideo = intro;

  res.status(200).json({
    message: "success",
    data: {
      course,
      isPurchased,
    },
  });
});

exports.getCoursePreview = catchAsync(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (course.published === false) {
    return next(new AppError("No Course found with that id", 404));
  }

  course.modules = undefined;

  if (!course) {
    return next(new AppError("No Course found with that id", 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      course,
    },
  });
});

exports.createCourse = catchAsync(async (req, res, next) => {
  let course = req.body;
  course.instructor = req.user.id;
  const newCourse = await Course.create(course);

  res.status(201).json({
    message: "success",
    data: {
      newCourse,
    },
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body);

  if (!course) {
    return next(new AppError("No Course found with that id", 404));
  }

  res.status(202).json({
    message: "success",
    data: {
      course,
    },
  });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.id);

  if (!course) {
    return next(new AppError("No Course found with that id", 404));
  }

  res.status(204).json({
    message: "success",
    data: null,
  });
});
