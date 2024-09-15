const jwt = require("jsonwebtoken");
const Users = require("../models/Users.js");

async function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/admin/login");

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = await Users.findById(decoded.userId);
    next();
  } catch (error) {
    res.redirect("/admin//login");
  }
}

module.exports = verifyToken;
