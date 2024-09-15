const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

// Define your schema
const ScheduleSchema = new mongoose.Schema({
  // Add a field for sequential ID
  hidden: { type: Boolean, default: false },
  permaDelete: { type: Boolean, default: false },
  objId: {
    type: Number,
    unique: true,
  },
  date: String,
  schedule: [
    {
      urlString: String,
      startTime: String,
      endTime: String,
      title: String,
      category: { type: mongoose.Schema.Types.Mixed },
      league: {
        urlString: String,
        name: String,
      },
      team1: {
        urlString: String,
        teamName: String,
      },
      team2: {
        urlString: String,
        teamName: String,
      },
      links: Array,
      hidden: { type: Boolean, default: false },
    },
  ],
  created: { type: Date, default: new Date() },
});

// Apply the AutoIncrement plugin to your schema for the objId field
ScheduleSchema.plugin(AutoIncrement, {
  inc_field: "objId",
  index: true
});
module.exports = mongoose.model("Schedule", ScheduleSchema);
