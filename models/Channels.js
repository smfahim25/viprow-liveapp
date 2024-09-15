const mongoose = require("mongoose");

const ChannelsSchema = new mongoose.Schema({
  objId: String,
  name: String,
  tag: String,
  link: String,
  created: { type: Date, default: new Date() },
});

module.exports = mongoose.model("Channels", ChannelsSchema);
