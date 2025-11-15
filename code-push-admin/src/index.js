const express = require("express");
const path = require("path");
const session = require("express-session");
const dotenv = require("dotenv");
const router = require("./controller/router");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "1234567890",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Mount routes
app.use("/", router);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
