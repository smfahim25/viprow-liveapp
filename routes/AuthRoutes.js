const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const Users = require("../models/Users.js");

router.get("/login", async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    res.render("admin/login.ejs");
  } else {
    res.redirect("/admin");
  }
});

router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await Users.findOne({ username });

    if (!user) {
      req.flash("danger", "User not found");
      return res.redirect("/admin/login");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      req.flash("danger", "Password is incorrect");
      return res.redirect("/admin/login");
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET, {
      expiresIn: "1d",
    });

    res
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .redirect("/admin");
  } catch (err) {
    next(err);
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/admin/login");
});

module.exports = router;
