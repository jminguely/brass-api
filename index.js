const express = require('express');
const minifyHTML = require('express-minify-html');
const moment = require("moment");
const basicAuth = require('express-basic-auth');
require('dotenv').config();
moment.locale("fr_FR");
const app = express();

const agendaRoutes = require("./routes/agenda");
// const calendarRoutes = require("./routes/calendar");
const calendarSingleRoutes = require("./routes/event-ics");
const musiciensRoutes = require("./routes/musiciens");
const musicienRoutes = require("./routes/musicien");
const eventRoutes = require("./routes/event");

app.use(basicAuth({
  users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASSWORD },
  challenge: true,
}));

app.use(agendaRoutes);
// app.use(calendarRoutes);
app.use(calendarSingleRoutes);
app.use(musiciensRoutes);
app.use(musicienRoutes);
app.use(eventRoutes);

app.use(express.static("public"));

app.use(
  minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      minifyJS: true,
    },
  })
);

// Redirect routes
app.get("/", (req, res) => res.redirect("/agenda"));
app.get("/concerts", (req, res) => res.redirect("/agenda"));

// Start the server
app.listen(process.env.PORT, process.env.IP, () => {
  console.log(`BMF API server on: http://${process.env.IP}:${process.env.PORT}`);
});
