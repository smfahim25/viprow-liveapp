const mongoose = require("mongoose");

const AdsSchema = new mongoose.Schema({
  head: String,
  top: String,
  bottom: String,

  created: { type: Date, default: new Date() },
});

module.exports = mongoose.model("Ads", AdsSchema);
