const express = require("express");
const axios = require("axios");
const router = express.Router();
const { requireAuth } = require("../../middleware/auth");
const renderLayout = require("../../utils/renderLayout");

// GET /signin
router.get("/signin", async (req, res) => {
  if (req.session.token) {
    return res.redirect("/");
  }

  await renderLayout(req, res, "auth/signin", {
    showHeader: false,
    title: "Login Page",
    error: null,
  });
});

// POST /signin
router.post("/signin", async (req, res) => {
  const { username, password, host } = req.body;
  if (!host) {
    await renderLayout(req, res, "auth/signin", {
      showHeader: false,
      title: "Login Page",
      error: "Host is not invalid",
    });
    return;
  }
  try {
    const response = await axios.post(`${host}/auth/login`, {
      account: username,
      password: password
    }, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data.status === "OK") {
      req.session.token = response.data.results.tokens;
      req.session.host = host;
      return res.redirect("/");
    } 
    await renderLayout(req, res, "auth/signin", {
      showHeader: false,
      title: "Login Page",
      error: "Login failed",
    });
    return;
  } catch (error) {
    await renderLayout(req, res, "auth/signin", {
      showHeader: false,
      title: "Login Page",
      error: "Invalid credentials or server error. Please check host available!",
    });
  }
});

// POST /auth/signout
router.post("/signout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Something went wrong");
    }

    // Clear session cookie
    res.clearCookie("connect.sid"); // default name of the session cookie

    return res.redirect("/auth/signin");
  });
});

module.exports = router;
