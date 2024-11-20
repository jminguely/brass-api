const express = require('express');
const router = express.Router();
const moment = require("moment");
moment.locale("fr_FR");
const base = require('../config/airtable');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

router.get("/musiciens/:musicien_id", async function (req, res) {
  const musicien_id = req.params.musicien_id;
  let musicien = cache.get(`musicien_${musicien_id}`);

  if (!musicien) {
    const musiciens = await base("Musiciens").select({ filterByFormula: `RECORD_ID() = '${musicien_id}'` }).all();
    musicien = musiciens[0];
    cache.set(`musicien_${musicien_id}`, musicien);
  }

  const concerts = await base("Concerts").select({ sort: [{ field: "Date check-in", direction: "asc" }] }).all();

  let gigs = [];

  Object.keys(musicien.fields).forEach((key) => {
    if (key.includes("Concerts")) {
      musicien.fields[key].forEach(async (concertId) => {
        concerts.forEach(async (concert, index) => {
          if (concertId === concert.id && !key.includes("absent")) {
            gigs.push({
              id: concert.id,
              date: moment(concert.fields["Date check-in"]).format("DD.MM.YY"),
              dateSortable: moment(concert.fields["Date fin"]).format("x"),
              titre: concert.fields["Titre"],
              statut: concert.fields["Statut"],
              type: concert.fields["Type"],
              ville: concert.fields["Ville"],
              past: concert.fields["Past"],
            });
          }
        });
      });
    }
  });

  let person = {};

  person = {
    id: musicien.id,
    fields: musicien.fields,
    gigs: gigs,
  };

  res.render("musicien.html.twig", {
    musicien: person,
  });
});

module.exports = router;
