require("dotenv").config();

const Airtable = require('airtable');

Airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: process.env.AIRTABLE_API_KEY,
});

var base = Airtable.base("appOvGQqOefkMpE9o");

module.exports = base;
