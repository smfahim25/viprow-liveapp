const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/London");

  const app = express();

mongoose
  .connect(process.env.DB)
  .then(() => console.log("Connection To DB Successful"))
  .catch(() => console.log("Error While Connecting To DB"));


const AuthRoutes = require("./routes/AuthRoutes.js");
const AdminRoutes = require("./routes/AdminRoutes.js");
const UserRoutes = require("./routes/UserRoutes.js");
const SiteMapRoutes = require("./routes/SitemapRoutes.js");


const TokenVerify = require("./middlewares/tokenVerify.js");

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", SiteMapRoutes)
app.use("/", UserRoutes);

app.use("/admin", AuthRoutes);
app.use(TokenVerify);
app.use("/admin", AdminRoutes);

const Schedule = require("./models/Schedule.js");



// 500 Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error/500.ejs");
});

// 404 Middleware
app.use(function (req, res, next) {
  res.status(404).render("error/404.ejs");
});

const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log('Server listening on port'+PORT);
  });
