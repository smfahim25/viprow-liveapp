const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  urlString: String,
  name: String,
  categoryLogo: String,
  logo: String,
  teams: Array,
  leagues: Array,

  created: { type: Date, default: new Date() },
});

module.exports = mongoose.model("Categories", CategorySchema);
