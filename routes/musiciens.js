const express = require('express');
const router = express.Router();
const moment = require("moment");
moment.locale("fr_FR");
const base = require('../config/airtable');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

router.get("/musiciens", async function (req, res) {
  let musiciens = cache.get('musiciens');

  if (!musiciens) {
    musiciens = await base("Musiciens").select().all();
    cache.set('musiciens', musiciens);
  }

  const effectifs = [];
  const instruments = [];
  const statuts = [];

  musiciens.forEach((musicien) => {
    let person = {};

    person = {
      id: musicien.id,
      fields: musicien.fields,
    };

    effectifs.push(person);

    if (instruments.indexOf(musicien.fields["Instrument"]) === -1)
      instruments.push(musicien.fields["Instrument"]);
    if (statuts.indexOf(musicien.fields["Statut"]) === -1)
      statuts.push(musicien.fields["Statut"]);
  });

  res.render("musiciens.html.twig", {
    musiciens: effectifs,
    instruments: instruments,
    statuts: statuts,
  });
});

module.exports = router;
