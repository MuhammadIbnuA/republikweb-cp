const express = require("express");
const userController = require("../controller/usercontroller");

const router = express.Router();

// Register a new user
router.post("/register", userController.registerUser);

// Login
router.post("/login", userController.login);

module.exports = router;
