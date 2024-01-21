const express = require('express');
const router = express.Router();
const base = require('../config/airtable');
const moment = require("moment");
moment.locale("fr_FR");
const formatDate = require('../utils/formatDate');
const ics = require('ics');

const MAX_RECORDS = 1000;
const CONCERTS_TABLE = "Concerts";
const FILTER_FORMULA = "OR({Statut} = 'Booking', {Statut} = 'Confirmé')";

router.get('/calendar', async (req, res) => {
  try {
    const concerts = await base(CONCERTS_TABLE)
      .select({
        maxRecords: MAX_RECORDS,
        filterByFormula: FILTER_FORMULA,
        sort: [{ field: "Date check-in", direction: "asc" }],
      })
      .all();

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

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching calendar events.');
  }
});

module.exports = router;
