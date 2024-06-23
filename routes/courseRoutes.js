const express = require("express");

const courseController = require("./../controllers/courseController");
const authController = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(courseController.getAllCourses)
  .post(
    authController.protect,
    authController.restrictTo("admin", "author"),
    courseController.createCourse
  );

router
  .route("/:id")
  .get(authController.protect, courseController.getCourse)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    courseController.updateCourse
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    courseController.deleteCourse
  );

router.route("/preview/:id").get(courseController.getCoursePreview);

module.exports = router;
