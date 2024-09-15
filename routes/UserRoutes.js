const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");

const Schedule = require("../models/Schedule.js");
const Categories = require("../models/Categories.js");
const Channels = require("../models/Channels.js");
const Ads = require("../models/Ads.js");

function findTimeLeft(time) {
  const streamStartTime = moment(time);

  const currentUkTime = moment();

  const minutesDifference = streamStartTime.diff(currentUkTime, "minutes");

  const isLessThanOneHour = minutesDifference < 60;

  return isLessThanOneHour;
}

function findStartTime(time) {
  const streamStartTime = moment(time);

  const currentUkTime = moment();

  const minutesDifference = streamStartTime.diff(currentUkTime, "minutes");

  const isLessThanOneHour = minutesDifference < 10;

  return isLessThanOneHour;
}

function streamEnd(time) {
  if (!time) {
    return false;
  }
  const streamEndTime = moment(time);
  const currentUkTime = moment();
  const hasEnded = currentUkTime.isAfter(streamEndTime);
  return hasEnded;
}

router.get("/privacy-policy", async (req, res) => {
  const categories = await Categories.find();

  res.render("user/privacy-policy.ejs", { categories });
});

router.get("/dmca", async (req, res) => {
  const categories = await Categories.find();

  res.render("user/dmca.ejs", { categories });
});

router.get("/", async (req, res, next) => {
  try {
    const search = req.query.q;

    let schedules = await Schedule.find({ hidden: { $ne: true } });
    const categories = await Categories.find();

    if (search) {
      const searchLower = search.toLowerCase(); // Convert search query to lowercase
      for (const schedule of schedules) {
        schedule.schedule = schedule.schedule.filter((stream) => {
          const league = stream.league.name.toLowerCase(); // Convert team2 to lowercase
          const team1Lower = stream.team1.teamName.toLowerCase(); // Convert team1 to lowercase
          const team2Lower = stream.team2.teamName.toLowerCase(); // Convert team2 to lowercase
          return (
            league.includes(searchLower) ||
            team1Lower.includes(searchLower) ||
            team2Lower.includes(searchLower)
          );
        });
      }
    }

    for (const schedule of schedules) {
      schedule.schedule = schedule.schedule.filter((stream) => !stream.hidden);

      // Fetch category data for each stream
      for (const stream of schedule.schedule) {
        const category = await Categories.findById(stream.category);
        stream.category = category;

        // Fetch and update channel data for each link
        const updatedLinks = [];
        for (const linkId of stream.links) {
          const channel = await Channels.findById(linkId);
          updatedLinks.push(channel);
        }
        stream.links = updatedLinks;
      }

      // Sort the schedule's streams by startTime using Moment.js
      schedule.schedule.sort((a, b) =>
        moment(a.startTime).diff(moment(b.startTime))
      );
    }

    res.render("user/home.ejs", {
      schedules,
      moment,
      categories,
      findTimeLeft,
      findStartTime,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/category/:category", async (req, res, next) => {
  try {
    const paramCategory = req.params.category;
    const search = req.query.q;

    const requestedCategory = await Categories.findOne({
      urlString: paramCategory,
    });

    if (!requestedCategory) {
      return res.status(404).render("error/404.ejs");
    }

    const category = requestedCategory.name;

    // If the requested category does not exist, send a 404 response

    let schedules = await Schedule.find({ hidden: { $ne: true } });
    const categories = await Categories.find();

    if (search) {
      const searchLower = search.toLowerCase(); // Convert search query to lowercase
      for (const schedule of schedules) {
        schedule.schedule = schedule.schedule.filter((stream) => {
          const league = stream.league.name.toLowerCase(); // Convert team2 to lowercase
          const team1Lower = stream.team1.teamName.toLowerCase(); // Convert team1 to lowercase
          const team2Lower = stream.team2.teamName.toLowerCase(); // Convert team2 to lowercase
          return (
            league.includes(searchLower) ||
            team1Lower.includes(searchLower) ||
            team2Lower.includes(searchLower)
          );
        });
      }
    }

    // Loop through schedules to update stream categories
    for (const schedule of schedules) {
      schedule.schedule = schedule.schedule.filter((stream) => !stream.hidden);

      // Fetch category data for each stream
      for (const stream of schedule.schedule) {
        const category = await Categories.findById(stream.category);
        stream.category = category;

        // Fetch and update channel data for each link
        const updatedLinks = [];
        for (const linkId of stream.links) {
          const channel = await Channels.findById(linkId);
          updatedLinks.push(channel);
        }
        stream.links = updatedLinks;
      }

      // Sort the schedule's streams by startTime using Moment.js
      schedule.schedule.sort((a, b) =>
        moment(a.startTime).diff(moment(b.startTime))
      );
    }

    for (let i = schedules.length - 1; i >= 0; i--) {
      const schedule = schedules[i];
      schedule.schedule = schedule.schedule.filter((stream) => {
        return stream.category.urlString === req.params.category;
      });
      if (schedule.schedule.length === 0) {
        schedules.splice(i, 1);
      }
    }

    res.render("user/category.ejs", {
      schedules,
      moment,
      categories,
      category,
      findTimeLeft,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/competition/:leagueName", async (req, res, next) => {
  try {
    const search = req.query.q;

    let schedules = await Schedule.find({ hidden: { $ne: true } });
    const categories = await Categories.find();

    if (search) {
      const searchLower = search.toLowerCase(); // Convert search query to lowercase
      for (const schedule of schedules) {
        schedule.schedule = schedule.schedule.filter((stream) => {
          const league = stream.league.name.toLowerCase(); // Convert team2 to lowercase
          const team1Lower = stream.team1.teamName.toLowerCase(); // Convert team1 to lowercase
          const team2Lower = stream.team2.teamName.toLowerCase(); // Convert team2 to lowercase
          return (
            league.includes(searchLower) ||
            team1Lower.includes(searchLower) ||
            team2Lower.includes(searchLower)
          );
        });
      }
    }

    // Filter schedules by the requested league name
    for (let i = schedules.length - 1; i >= 0; i--) {
      const schedule = schedules[i];
      schedule.schedule = schedule.schedule.filter((stream) => {
        return stream.league.urlString === req.params.leagueName;
      });
      if (schedule.schedule.length === 0) {
        schedules.splice(i, 1);
      }
    }

    // Loop through filtered schedules to update stream categories and sort streams
    for (const schedule of schedules) {
      schedule.schedule = schedule.schedule.filter((stream) => !stream.hidden);

      // Fetch category data for each stream
      for (const stream of schedule.schedule) {
        const category = await Categories.findById(stream.category);
        stream.category = category;

        // Fetch and update channel data for each link
        const updatedLinks = [];
        for (const linkId of stream.links) {
          const channel = await Channels.findById(linkId);
          updatedLinks.push(channel);
        }
        stream.links = updatedLinks;
      }

      // Sort the schedule's streams by startTime using Moment.js
      schedule.schedule.sort((a, b) =>
        moment(a.startTime).diff(moment(b.startTime))
      );
    }

    const category = await Categories.findOne({
      "leagues.urlString": req.params.leagueName,
    });

    if (!category) {
      return res.status(404).render("error/404.ejs");
    }

    const league = category.leagues.find(
      (league) => league.urlString === req.params.leagueName
    ).name;

    res.render("user/league.ejs", {
      schedules,
      moment,
      categories,
      league,
      findTimeLeft,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/team/:teamName", async (req, res, next) => {
  try {
    const search = req.query.q; // Get the search query from the request

    let schedules = await Schedule.find({ $and: [{ hidden: { $ne: true } }] });
    const categories = await Categories.find(); // Find all categories

    if (search) {
      const searchLower = search.toLowerCase(); // Convert search query to lowercase
      for (const schedule of schedules) {
        schedule.schedule = schedule.schedule.filter((stream) => {
          const league = stream.league.name.toLowerCase(); // Convert team2 to lowercase
          const team1Lower = stream.team1.teamName.toLowerCase(); // Convert team1 to lowercase
          const team2Lower = stream.team2.teamName.toLowerCase(); // Convert team2 to lowercase
          return (
            league.includes(searchLower) ||
            team1Lower.includes(searchLower) ||
            team2Lower.includes(searchLower)
          );
        });
      }
    }

    for (let i = schedules.length - 1; i >= 0; i--) {
      const schedule = schedules[i];
      schedule.schedule = schedule.schedule.filter((stream) => {
        return (
          stream.team1.urlString === req.params.teamName ||
          stream.team2.urlString === req.params.teamName
        );
      });
      if (schedule.schedule.length === 0) {
        schedules.splice(i, 1);
      }
    }

    // Loop through filtered schedules to update stream categories and sort streams
    for (const schedule of schedules) {
      schedule.schedule = schedule.schedule.filter(
        (stream) => stream.hidden !== true // Filter out hidden streams
      );
      for (const stream of schedule.schedule) {
        // Fetch category data using the ID stored in the schedule
        const category = await Categories.findById(stream.category);
        // Update the stream's category with the fetched category data
        stream.category = category;
      }

      schedule.schedule.sort(
        (a, b) => moment(a.startTime).diff(moment(b.startTime)) // Sort streams by start time
      );
    }

    const category = await Categories.findOne({
      "teams.urlString": req.params.teamName,
    });

    if (!category) {
      return res.status(404).render("error/404.ejs");
    }

    const team = category.teams.find(
      (team) => team.urlString === req.params.teamName
    ).teamName;

    res.render("user/team.ejs", {
      schedules,
      moment,
      categories,
      team,
      findTimeLeft,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:scheduleId/watch/:stream/:playerIndex",
  async (req, res, next) => {
    try {
      const { scheduleId, playerIndex } = req.params;

      const parsedPlayerIndex = +playerIndex.split("-")[1];

      const schedule = await Schedule.findOne({ objId: scheduleId }).catch(
        (err) => {
          return res.status(500).render("error/500.ejs");
        }
      );

      const Stream = schedule.schedule.find(
        (stream) => stream.urlString === req.params.stream
      );

      const title = Stream.title;

      const category = await Categories.findById(Stream.category).catch(
        (err) => {
          return res.status(500).render("error/500.ejs");
        }
      );

      Stream.category = category;

      const updatedLinks = [];
      for (const linkId of Stream.links) {
        const channel = await Channels.findById(linkId);
        updatedLinks.push(channel);
      }

      Stream.links = updatedLinks;

      const channel = await Channels.findById(
        Stream.links[parsedPlayerIndex - 1]
      ).catch((err) => {
        return res.status(500).render("error/500.ejs");
      });

      if (!channel) {
        return res.status(404).render("error/404.ejs");
      }

      const categories = await Categories.find().catch((err) => {
        return res.status(500).render("error/500.ejs");
      });

      const ads = await Ads.findOne().catch((err) => {
        return res.status(500).render("error/500.ejs");
      });
      const embed = `<iframe frameborder=0 width=640 height=480 src='https://viprow1.live/embed/${scheduleId}/${Stream.urlString}/stream-${parsedPlayerIndex}' allowfullscreen scrolling=no allowtransparency></iframe>`;

      res.render("user/streamPage.ejs", {
        channel,
        categories,
        ads,
        title,
        category: category.name,
        embed,
        findTimeLeft,
        streamEnd,
        Stream,
        scheduleId,
        schedule,
        moment,
        parsedPlayerIndex,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

router.get("/:scheduleId/watch/:stream", async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await Schedule.findOne({ objId: scheduleId }).catch(
      (err) => {
        return res.status(404).render("error/404.ejs");
      }
    );

    const Stream = schedule.schedule.find(
      (stream) => stream.urlString === req.params.stream
    );

    const title = Stream.title;

    const category = await Categories.findById(Stream.category).catch((err) => {
      return res.status(500).render("error/500.ejs");
    });

    Stream.category = category;

    const categories = await Categories.find().catch((err) => {
      return res.status(500).render("error/500.ejs");
    });

    const ads = await Ads.findOne().catch((err) => {
      return res.status(500).render("error/500.ejs");
    });

    const embed = `<iframe frameborder=0 width=640 height=480 src='https://viprow1.live/embed/${scheduleId}/${Stream.urlString}/stream-1' allowfullscreen scrolling=no allowtransparency></iframe>`;

    res.render("user/fakePlayer.ejs", {
      categories,
      ads,
      title,
      category: category.name,
      embed,
      scheduleId,
      schedule,
      findTimeLeft,
      Stream,
      moment,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
