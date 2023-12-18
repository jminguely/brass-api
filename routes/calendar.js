const express = require('express');
const router = express.Router();
const base = require('../config/airtable');
const formatDate = require('../utils/formatDate');

const TABLE_NAME = 'Agenda';
const FILTER_FORMULA = "OR({Statut} = 'Booking', {Statut} = 'Confirmé')";

router.get('/calendar', async (req, res) => {
  try {
    const records = await base(TABLE_NAME).select({
      filterByFormula: FILTER_FORMULA,
      sort: [{ field: "Date de début", direction: "asc" }]
    }).all();

    const events = records.map(record => {
      const startDate = moment(record.get('Date de début'));
      const endDate = moment(record.get('Date de fin'));
      return {
        title: record.get('Nom'),
        start: startDate.format(),
        end: endDate.format(),
        extendedProps: {
          date: formatDate(startDate, endDate),
          location: record.get('Lieu'),
          status: record.get('Statut'),
          musicians: record.get('Musiciens'),
        },
      };
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching calendar events.');
  }
});

module.exports = router;
