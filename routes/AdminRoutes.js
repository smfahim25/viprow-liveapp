const express = require("express");
const router = express.Router();
const multer = require("multer");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");


const path = require("path");
const fs = require("fs");
const moment = require("moment");
require("moment-timezone");

const Schedule = require("../models/Schedule.js");
const Categories = require("../models/Categories.js");
const Channels = require("../models/Channels.js");
const Ads = require("../models/Ads.js");
const Users = require("../models/Users.js");



// Memory storage configuration
const storage = multer.memoryStorage();

const upload = multer({ storage });


// Define a function to periodically check and update documents
async function checkAndUpdateDocuments() {
  try {
    // Get the current time using Moment.js
    const currentTime = moment();

    // Find documents where the current time is past the end time
    const expiredSchedules = await Schedule.find();

    // Update each matching document
    for (const scheduleDoc of expiredSchedules) {
      for (const schedule of scheduleDoc.schedule) {
        if (moment(schedule.endTime).isBefore(currentTime)) {
          schedule.hidden = true;
        }
      }
      await scheduleDoc.save(); // Save the updated document
    }
  } catch (error) {
    console.error("Error while updating documents:", error);
  }
}
setInterval(checkAndUpdateDocuments, 5 * 1000);

function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
    } else {
      console.log("File deleted successfully:", filePath);
    }
  });
}

function idGenerator() {
  return Math.random().toString().substr(2, 7);
}

router.get("/", async (req, res, next) => {
  try {
    const schedules = await Schedule.find();

    res.render("admin/dashboard.ejs", { userInfo: req.user });
  } catch (err) {
    next(err);
  }
});

router.get("/ads-placement", async (req, res, next) => {
  try {
    const schedules = await Schedule.find();
    const ads = await Ads.findOne();

    res.render("admin/adsPlacement.ejs", { userInfo: req.user, ads });
  } catch (err) {
    next(err);
  }
});

router.post("/ads-placement", async (req, res, next) => {
  try {
    const { head, top, bottom } = req.body;

    const schedules = await Schedule.find();

    await Ads.deleteMany();

    const newAds = new Ads({
      head,
      top,
      bottom,
    });

    await newAds.save();

    res.redirect("/admin/ads-placement");
  } catch (err) {
    next(err);
  }
});

router.post("/get-lists/:categoryId", async (req, res, next) => {
  try {
    const category = await Categories.findById(req.params.categoryId);

    res.json(category);
  } catch (err) {
    next(err);
  }
});

router.get("/schedule", async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ permaDelete: { $ne: true } });

    res.render("admin/schedule.ejs", { userInfo: req.user, schedules, moment });
  } catch (err) {
    next(err);
  }
});

router.post("/new-schedule", async (req, res, next) => {
  try {
    const { date, schedule } = req.body;

    // Parse the incoming date string into a Moment object
    const momentDate = moment(date, "DD-MM-YYYY");

    const newSchedule = new Schedule({
      date: momentDate.format(),
    });

    await newSchedule.save();

    req.flash("success", "Schedule Created Successfully");
    res.redirect("/admin/schedule");
  } catch (err) {
    next(err);
  }
});

router.get("/delete-schedule/:scheduleId", async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);

    schedule.permaDelete = true;
    schedule.hidden = true;

    await schedule.save();

    req.flash("success", "Schedule Deleted Successfully");

    res.redirect("/admin/schedule");
  } catch (err) {
    next(err);
  }
});

router.post("/edit-schedule/:scheduleId", async (req, res, next) => {
  try {
    const { date } = req.body;

    const schedule = await Schedule.findById(req.params.scheduleId);

    const parsedDate = moment(date, "DD-MM-YYYY").format();

    schedule.date = parsedDate;

    await schedule.save();

    req.flash("success", "Schedule Edited Successfully");

    res.redirect("/admin/schedule");
  } catch (err) {
    next(err);
  }
});

router.post("/change-schedule-status/:scheduleId", async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);

    schedule.hidden = req.body.status;

    await schedule.save();

    res.json("success");
  } catch (err) {
    next(err);
  }
});

router.get("/schedule/:scheduleId", async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);
    const categories = await Categories.find();
    const channels = await Channels.find();

    // Fetch category data for each schedule's stream

    for (const stream of schedule.schedule) {
      // Fetch category data using the ID stored in the schedule
      const category = await Categories.findById(stream.category);
      // Update the stream's category with the fetched category data
      stream.category = category;

      const updatedLinks = [];
      for (const linkId of stream.links) {
        const channel = await Channels.findById(linkId);
        updatedLinks.push(channel);
      }
      stream.links = updatedLinks;
    }

    res.render("admin/manageSchedule.ejs", {
      userInfo: req.user,
      schedule,
      categories,
      channels,
      moment,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/schedule/new-stream/:scheduleId", async (req, res, next) => {
  try {
    let { startTime, endTime, category, leagueName, team1, team2, links } =
      req.body;

    const schedule = await Schedule.findById(req.params.scheduleId);
    const categories = await Categories.findById(category);

    const team1Obj = {
      urlString: encodeURI(`${team1}`.replaceAll(" ", "-").toLowerCase()),
      teamName: team1,
    };

    const team2Obj = {
      urlString: encodeURI(`${team2}`.replaceAll(" ", "-").toLowerCase()),
      teamName: team2,
    };

    const leagueObj = {
      urlString: `${leagueName}`.replaceAll(" ", "-").toLowerCase(),
      name: leagueName,
    };

    // Check if the urlString already exists in categories.teams
    if (
      !categories.teams.some((team) => team.urlString === team1Obj.urlString)
    ) {
      categories.teams.push(team1Obj);
    }

    if (team2) {
      if (
        !categories.teams.some((team) => team.urlString === team2Obj.urlString)
      ) {
        categories.teams.push(team2Obj);
      }
    }

    // Check if the urlString already exists in categories.leagues
    if (
      !categories.leagues.some(
        (league) => league.urlString === leagueObj.urlString
      )
    ) {
      categories.leagues.push(leagueObj);
    }

    const urlString =
      team2 === ""
        ? encodeURI(`${team1}`.replaceAll(" ", "-").toLowerCase())
        : encodeURI(`${team1} vs ${team2}`.replaceAll(" ", "-").toLowerCase());

    const title = team2 === "" ? `${team1}` : `${team1} vs ${team2}`;

    // Ensure links is always an array
    const normalizedLinks = Array.isArray(links) ? links : [links];

    // Get the date from the parent object and convert it to UK timezone
    const parentDate = moment(schedule.date);

    let endParentDate = moment(schedule.date);

    // Parse startTime to get hours and minutes
    const [hours, minutes] = startTime.split(":").map(Number);

    // Set hours and minutes from startTime to the parent date
    parentDate.hours(hours);
    parentDate.minutes(minutes);

    let formattedEndParentDate;

    if (endTime !== undefined) {
      const [endHours, endMinutes] = endTime.split(":").map(Number);

      endParentDate.hours(endHours);
      endParentDate.minutes(endMinutes);

      formattedEndParentDate = endParentDate.format();
    } else {
      endParentDate = "";

      formattedEndParentDate = null;
    }

    const newStream = {
      urlString,
      startTime: parentDate.format(), // Update startTime with the modified date
      endTime: formattedEndParentDate, // Update startTime with the modified date
      title,
      category,
      league: leagueObj,
      team1: team1Obj,
      team2: team2Obj,
      links: normalizedLinks,
    };

    schedule.schedule.push(newStream);

    await categories.save();
    await schedule.save();

    req.flash("success", "Stream Added Successfully");

    res.redirect(`/admin/schedule/${req.params.scheduleId}`);
  } catch (err) {
    next(err);
  }
});

router.get("/delete-stream/:scheduleId/:streamId", async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);

    // Find the index of the stream in the schedule
    const streamIndex = schedule.schedule.findIndex(
      (stream) => stream._id === req.params.streamId
    );

    // Remove the stream from the schedule
    const deletedStream = schedule.schedule.splice(streamIndex, 1);

    // Save the updated schedule
    await schedule.save();

    req.flash("success", "Stream Deleted Successfully");
    res.redirect(`/admin/schedule/${req.params.scheduleId}`);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/schedule/edit-stream/:scheduleId/:streamId",
  async (req, res, next) => {
    try {
      let { startTime, endTime, category, leagueName, team1, team2, links } =
        req.body;

      const schedule = await Schedule.findById(req.params.scheduleId);
      const categories = await Categories.findById(category);

      const team1Obj = {
        urlString: encodeURI(`${team1}`.replaceAll(" ", "-").toLowerCase()),
        teamName: team1,
      };

      const team2Obj = {
        urlString: encodeURI(`${team2}`.replaceAll(" ", "-").toLowerCase()),
        teamName: team2,
      };

      const leagueObj = {
        urlString: `${leagueName}`.replaceAll(" ", "-").toLowerCase(),
        name: leagueName,
      };

      // Check if the urlString already exists in categories.teams
      if (
        !categories.teams.some((team) => team.urlString === team1Obj.urlString)
      ) {
        categories.teams.push(team1Obj);
      }

      if (team2) {
        if (
          !categories.teams.some(
            (team) => team.urlString === team2Obj.urlString
          )
        ) {
          categories.teams.push(team2Obj);
        }
      }

      // Check if the urlString already exists in categories.leagues
      if (
        !categories.leagues.some(
          (league) => league.urlString === leagueObj.urlString
        )
      ) {
        categories.leagues.push(leagueObj);
      }

      const urlString =
        team2 === ""
          ? encodeURI(`${team1}`.replaceAll(" ", "-").toLowerCase())
          : encodeURI(
              `${team1} vs ${team2}`.replaceAll(" ", "-").toLowerCase()
            );

      const title = team2 === "" ? `${team1}` : `${team1} vs ${team2}`;

      // Ensure links is always an array
      const normalizedLinks = Array.isArray(links) ? links : [links];

      const stream = schedule.schedule.find(
        (stream) => stream.id === req.params.streamId
      );

      const parentDate = moment(schedule.date);

      let endParentDate = moment(schedule.date);

      // Parse startTime to get hours and minutes
      const [hours, minutes] = startTime.split(":").map(Number);

      let formattedEndParentDate;

      if (endTime !== undefined) {
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        endParentDate.hours(endHours);
        endParentDate.minutes(endMinutes);

        formattedEndParentDate = endParentDate.format();
      } else {
        endParentDate = "";

        formattedEndParentDate = null;
      }

      // Set hours and minutes from startTime to the parent date
      parentDate.hours(hours);
      parentDate.minutes(minutes);

      stream.urlString = urlString;
      stream.startTime = parentDate.format();
      stream.endTime = formattedEndParentDate; // Update startTime with the modified date
      stream.category = category;
      stream.title = title;
      stream.league = leagueObj;
      stream.team1 = team1Obj;
      stream.team2 = team2Obj;
      stream.links = normalizedLinks;
      stream.hidden = false;

      await categories.save();
      await schedule.save();

      req.flash("success", "Stream Edited Successfully");

      res.redirect(`/admin/schedule/${req.params.scheduleId}`);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await Categories.find();

    res.render("admin/categories.ejs", { userInfo: req.user, categories });
  } catch (err) {
    next(err);
  }
});


router.post('/new-category', upload.fields([
  { name: 'categoryLogo', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      req.flash('error', 'Category name is required');
      return res.redirect('/admin/categories');
    }

    let categoryLogo = null;
    let logo = null;

    if (req.files) {
      if (req.files.categoryLogo) {
        const categoryLogoFilename = name + path.extname(req.files.categoryLogo[0].originalname);
        const categoryLogoPath = path.join(__dirname, '../public/uploads/category', categoryLogoFilename);
        fs.writeFileSync(categoryLogoPath, req.files.categoryLogo[0].buffer);
        categoryLogo = '/uploads/category/' + categoryLogoFilename;
      }
      if (req.files.logo) {
        const logoFilename = name + path.extname(req.files.logo[0].originalname);
        const logoPath = path.join(__dirname, '../public/uploads/logos', logoFilename);
        fs.writeFileSync(logoPath, req.files.logo[0].buffer);
        logo = '/uploads/logos/' + logoFilename;
      }
    }

    const urlString = encodeURI(name.replace(/ /g, '-').toLowerCase());

    const newCategory = new Categories({
      urlString,
      name,
      categoryLogo,
      logo,
    });

    await newCategory.save();

    req.flash('success', 'Category Added Successfully');
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
});


router.get("/delete-category/:categoryId", async (req, res, next) => {
  try {
    const category = await Categories.findById(req.params.categoryId);

    await Categories.findByIdAndDelete(req.params.categoryId);

    deleteFile("public" + category.logo);

    req.flash("success", "Category Deleted Successfully");

    res.redirect("/admin/categories");
  } catch (err) {
    next(err);
  }
});

router.post(
  "/edit-category/:categoryId",
  upload.fields([
    { name: "categoryLogo", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { name } = req.body;

      if (!name) {
        req.flash("error", "Category name is required");
        return res.redirect("/admin/categories");
      }

      let categoryLogo = null;
      let logo = null;
  
      if (req.files) {
        if (req.files.categoryLogo) {
          const categoryLogoFilename = name + path.extname(req.files.categoryLogo[0].originalname);
          const categoryLogoPath = path.join(__dirname, '../public/uploads/category', categoryLogoFilename);
          fs.writeFileSync(categoryLogoPath, req.files.categoryLogo[0].buffer);
          categoryLogo = '/uploads/category/' + categoryLogoFilename;
        }
        if (req.files.logo) {
          const logoFilename = name + path.extname(req.files.logo[0].originalname);
          const logoPath = path.join(__dirname, '../public/uploads/logos', logoFilename);
          fs.writeFileSync(logoPath, req.files.logo[0].buffer);
          logo = '/uploads/logos/' + logoFilename;
        }
      }

      const category = await Categories.findById(req.params.categoryId);

      const urlString = encodeURI(`${name}`.replaceAll(" ", "-").toLowerCase());

      category.urlString = urlString;
      category.name = name;

      await category.save();

      req.flash("success", "Category Edited Successfully");
      res.redirect("/admin/categories");
    } catch (err) {
      next(err);
    }
  }
);

router.get("/channels", async (req, res, next) => {
  try {
    const channels = await Channels.find();

    res.render("admin/channels.ejs", { userInfo: req.user, channels });
  } catch (err) {
    next(err);
  }
});

router.post("/new-channel", async (req, res, next) => {
  try {
    const { name, link } = req.body;

    const newChannel = new Channels({
      name,
      tag: name.replace(/ /g, "-").toLowerCase(),
      link,
    });

    await newChannel.save();

    req.flash("success", "Channel Added Successfully");
    res.redirect("/admin/channels");
  } catch (err) {
    next(err);
  }
});

router.get("/delete-channel/:channelId", async (req, res, next) => {
  try {
    await Channels.findByIdAndDelete(req.params.channelId);

    req.flash("success", "Channel Deleted Successfully");

    res.redirect("/admin/channels");
  } catch (err) {
    next(err);
  }
});

router.post("/edit-channel/:channelId", async (req, res, next) => {
  try {
    const { name, link } = req.body;

    const channel = await Channels.findById(req.params.channelId);

    channel.name = name;
    tag = name.replace(/ /g, "-").toLowerCase();
    channel.link = link;

    await channel.save();

    req.flash("success", "Channel Edited Successfully");
    res.redirect("/admin/channels");
  } catch (err) {
    next(err);
  }
});

router.get("/manage-account", async (req, res, next) => {
  try {
    res.render("admin/manageAcc.ejs", { userInfo: req.user });
  } catch (err) {
    next(err);
  }
});

router.post("/manage-account", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await Users.findById(req.user._id);

    if (username) {
      user.username = username;
    }

    if (password) {
if (password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  user.password = hashedPassword;
}    }

    await user.save();

    res.redirect("/admin/manage-account");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
