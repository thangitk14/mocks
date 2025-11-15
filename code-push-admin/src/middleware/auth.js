// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.token || !req.session.host) {
    return res.redirect("/auth/signin");
  }
  next();
}

module.exports = {
  requireAuth
};
