const express = require('express');
const router = express.Router();
const moment = require("moment");
moment.locale("fr_FR");
const base = require('../config/airtable');
const ics = require('ics');
const path = require('path');
const fs = require('fs');

// Function to generate .ics file content
function generateICS(event) {
  const { error, value } = ics.createEvent({
    start: event.startDate,
    end: event.endDate,
    title: event.title,
    description: event.description,
    location: event.location,
    url: event.url,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: { name: 'Your Organization', email: 'organizer@example.com' },
  });

  if (error) {
    console.log(error);
    return null;
  }

  return value;
}

// Route handler for /agenda/:concert_id
router.get('/calendar/:concert_id', async function (req, res) {
  const concert_id = req.params.concert_id;

  try {
    const concerts = await base("Concerts")
      .select({
        maxRecords: 1,
        filterByFormula: `RECORD_ID() = '${concert_id}'`,
      })
      .all();

    if (concerts.length === 0) {
      return res.status(404).send('Concert not found');
    }

    const concert = concerts[0];
    const date_start = moment(concert.fields['Date check-in']);
    const date_end = moment(concert.fields['Date fin']);
    const start = date_start.format('YYYY-M-D-H-mm').split("-").map(Number);
    const end = concert.fields['Date fin'] ? date_end.format('YYYY-M-D-H-mm').split("-").map(Number) : start;

    const event = {
      id: concert.id,
      title: `BMF - ${concert.fields['Titre'] || concert.fields['Type']}`,
      description: concert.fields["Informations"] || '',
      startDate: start,
      endDate: end,
      location: concert.fields["Adresse"] || '',
      url: concert.fields['API'],
    };

    const icsContent = generateICS(event);

    if (!icsContent) {
      return res.status(500).send('Error generating calendar file');
    }

    const filePath = path.join(__dirname, `${concert_id}.ics`);
    fs.writeFileSync(filePath, icsContent);

    res.download(filePath, `BMF - ${concert.fields["Titre"]}.ics`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error generating calendar file');
      } else {
        // Clean up the file after sending it
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
