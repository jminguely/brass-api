const express = require('express');
const router = express.Router();
const moment = require("moment");
moment.locale("fr_FR");
const formatDate = require('../utils/formatDate');
const base = require('../config/airtable');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

router.get("/agenda", async function (req, res) {
  let musiciens = cache.get('musiciens');
  let concerts = cache.get('concerts');

  if (!musiciens) {
    musiciens = await base("Musiciens")
      .select({ maxRecords: 1000, filterByFormula: "OR({Statut} = 'Titulaire', {Statut} = 'Remplaçant')" })
      .all();
    cache.set('musiciens', musiciens);
  }

  if (!concerts) {
    concerts = await base("Concerts")
      .select({
        maxRecords: 1000,
        sort: [{ field: "Date check-in", direction: "asc" }],
      })
      .all();
    cache.set('concerts', concerts);
  }

  let nonReponduOriginal = {};

  musiciens.forEach((musicien) => {
    nonReponduOriginal[musicien.id] = musicien.fields.Nom;
  });

  let events = [];

  concerts.forEach((record) => {
    let nonRepondu = {};

    if (
      record.fields.Type === "Concert" &&
      record.fields.Statut === "Booking"
    ) {
      nonRepondu = Object.assign({}, nonReponduOriginal);
    }

    let effectifsForDuplicate = [];
    let effectifs = {};
    let gig = {};
    Object.keys(record.fields).forEach((key) => {
      if (key.includes("[Musiciens]")) {
        const registre = key.slice(0, -12);
        effectifs[registre] = {};
        musiciens.forEach((musicien) => {
          record.fields[key].forEach(async (musicienId) => {
            if (musicien.id === musicienId) {
              effectifs[registre][musicienId] = [];
              effectifs[registre][musicienId]["Nom"] = musicien.fields.Nom;
              effectifs[registre][musicienId]["Id"] = musicien.id;
              delete nonRepondu[musicien.id];

              if (!effectifsForDuplicate.includes(musicienId)) {
                effectifsForDuplicate.push(musicienId);
              } else {
                effectifs[registre][musicienId]["Duplicate"] = true;
              }
            }
          });
          if (musicien.fields.Statut == "Remplaçant") {
            delete nonRepondu[musicien.id];
          }
        });
      }
    });

    const startDate = moment(record.fields["Date check-in"]);
    const endDate = moment(record.fields["Date fin"]);

    let date = formatDate(startDate, endDate);

    gig = {
      id: record.id,
      fields: record.fields,
      date: date,
      dateSortable: endDate.format("x"),
      effectifs: effectifs,
      nonRepondu: nonRepondu,
    };
    events.push(gig);
  });

  res.render("agenda.html.twig", {
    events: events,
    layout: "futur",
  });
});

module.exports = router;
