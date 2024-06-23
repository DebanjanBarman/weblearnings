const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);
router.patch("/updateMyPassword", authController.updatePassword);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);
router.get("/me", userController.getMe);
router.get("/my-courses", userController.getMyPurchasedCourses);

router.get(
  "/get-my-created-courses",
  authController.restrictTo("author", "admin"),
  userController.getMyCreatedCourses
);
router
  .route("/my-courses/:id")
  .get(
    authController.restrictTo("author", "admin"),
    userController.getMyCreatedCourse
  )
  .patch(
    authController.restrictTo("author", "admin"),
    userController.updateMyCreatedCourse
  )
  .delete(
    authController.restrictTo("author", "admin"),
    userController.deleteMyCreatedCourse
  );

router.use(authController.restrictTo("admin"));
router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
