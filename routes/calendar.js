const express = require('express');
const router = express.Router();
const base = require('../config/airtable');
const moment = require("moment");
moment.locale("fr_FR");
const ics = require('ics');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

const MAX_RECORDS = 1000;
const CONCERTS_TABLE = "Concerts";
const FILTER_FORMULA = "OR({Statut} = 'Booking', {Statut} = 'Confirmé')";

router.get('/calendar', async (req, res) => {
  let concerts = cache.get('concerts');

  if (!concerts) {
    concerts = await base(CONCERTS_TABLE)
      .select({
        maxRecords: MAX_RECORDS,
        filterByFormula: FILTER_FORMULA,
        sort: [{ field: "Date check-in", direction: "asc" }],
      })
      .all();
    cache.set('concerts', concerts);
  }

  const events = concerts.map(concert => {
    const { fields } = concert;
    const date_start = moment(fields['Date check-in']);
    const date_end = moment(fields['Date fin']);
    const start = date_start.format('YYYY-M-D-H-mm').split("-").map(Number);
    const end = fields['Date fin'] ? date_end.format('YYYY-M-D-H-mm').split("-").map(Number) : start;

    return {
      title: `BMF - ${fields['Titre'] || fields['Type']}`,
      location: fields['Ville'],
      description: `${fields['API']}\n\n${fields['Informations'] || ""}`,
      url: fields['API'],
      start,
      end
    };
  });

  const { error, value } = ics.createEvents(events);
  req.is('text/calendar')
  res.send(value);

});

module.exports = router;
