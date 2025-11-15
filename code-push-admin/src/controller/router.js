const express = require("express");
const router = express.Router();

const authController = require("./auth");
const homeController = require("./home");
const appsController = require("./apps");

const { requireAuth } = require("../middleware/auth");

// Route auth
router.use("/auth", authController);

// Route apps
router.use("/", requireAuth, homeController);
router.use("/apps", requireAuth, appsController);

// 404 handler (must be last)
router.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

module.exports = router;
