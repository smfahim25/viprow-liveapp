const express = require("express");

const router = express.Router();

const { SitemapStream, streamToPromise } = require("sitemap");
const { createGzip } = require("zlib");

const Categories = require("../models/Categories.js");

// Route to generate the sitemap
router.get("/sitemap.xml", async (req, res) => {
  try {
    const categories = await Categories.find();

    const urls = [
      {
        url: `/`,
        changefreq: "daily",
        priority: 1,
      },
    ];

    // Loop through categories and add URLs for leagues and teams
    categories.forEach((category) => {
      urls.push({
        url: `/category/${category.urlString}`,
        changefreq: "weekly",
        priority: 0.8,
      });

      category.leagues.forEach((league) => {
        urls.push({
          url: `/competition/${league.urlString}`,
          changefreq: "weekly",
          priority: 0.8,
        });
      });

      category.teams.forEach((team) => {
        urls.push({
          url: `/team/${team.urlString}`,
          changefreq: "monthly",
          priority: 0.6,
        });
      });
    });

    // Create a sitemap stream
    const stream = new SitemapStream({ hostname: "https://viprow1.com/" });

    // Adding URLs to the sitemap
    urls.forEach((url) => {
      stream.write(url);
    });

    stream.end();

    res.header("Content-Type", "application/xml");
    res.header("Content-Encoding", "gzip");

    // Pipe the sitemap stream to response
    stream.pipe(createGzip()).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

module.exports = router;
