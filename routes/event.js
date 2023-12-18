const express = require('express');
const router = express.Router();
const moment = require("moment");
moment.locale("fr_FR");
const formatDate = require('../utils/formatDate');
const base = require('../config/airtable');

router.get("/agenda/:concert_id", async function (req, res) {
  const concert_id = req.params.concert_id;

  try {



    const musiciens = await base("Musiciens")
      .select({
        maxRecords: 1000,
        filterByFormula: "OR({Statut} = 'Titulaire', {Statut} = 'Remplaçant')"
      })
      .all();

    let nonReponduOriginal = {};

    musiciens.forEach((musicien) => {
      nonReponduOriginal[musicien.id] = musicien.fields.Nom;
    });

    const effectifs = {};

    var concerts = await base("Concerts")
      .select({
        maxRecords: 1000,
        filterByFormula: `RECORD_ID() = '${concert_id}'`,
      })
      .all();

    const concert = concerts[0];

    let nonRepondu = Object.assign({}, nonReponduOriginal);

    Object.keys(concert.fields).forEach((key) => {
      if (key.includes("[Musiciens]")) {
        const registre = key.slice(0, -12);
        effectifs[registre] = {};
        musiciens.forEach((musicien) => {
          concert.fields[key].forEach(async (musicienId) => {
            if (musicien.id === musicienId) {
              effectifs[registre][musicienId] = [];
              effectifs[registre][musicienId]["Nom"] = musicien.fields["Nom"];
              effectifs[registre][musicienId]["Mail"] = musicien.fields["E-Mail"];
              effectifs[registre][musicienId]["Regime"] =
                musicien.fields["Régime"];
              delete nonRepondu[musicien.id];
            }
          });
          if (musicien.fields.Statut == "Remplaçant") {
            delete nonRepondu[musicien.id];
          }
        });
      }
    });

    const startDate = moment(concert.fields["Date check-in"]);
    const endDate = moment(concert.fields["Date fin"]);

    const event = {
      fields: concert.fields,
      date: formatDate(startDate, endDate),
      effectifs: effectifs,
      nonRepondu: nonRepondu,
    };
    res.render("event.html.twig", {
      event: event,
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
