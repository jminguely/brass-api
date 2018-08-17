const express = require('express')
const app = express();
const ics = require('ics');
const Airtable = require('airtable');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.load();

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'keyO8mLzx0rpa46cY'
});

const base = Airtable.base('appOvGQqOefkMpE9o');

let events = [];


base('Concerts').select().eachPage(function page(records, fetchNextPage) {
  records.forEach(function(record) {
    const date_start = moment(record.get('Date check-in'));
    const date_end = moment(record.get('Date fin'));

    let event = {
      title:              `BMF - ${record.get('Titre') || record.get('Type')}`,
      location:           record.get('Ville'),
      url:                record.get('Export')
    }

    if(record.get('Informations')) {
      event.description = record.get('Informations');

    }

    if (record.get('Date fin')) {
      event.start =       date_start.format('YYYY-M-D-H-mm').split("-");
      event.end =         date_end.format('YYYY-M-D-H-mm').split("-");
    } else {
      event.start =       date_start.format('YYYY-M-D').split("-");
      event.end =         date_start.format('YYYY-M-D').split("-");
    }

    events.push(event);

  });

  fetchNextPage();

  generate_ical();


}, function done(err) {
  if (err) { console.error(err); return; }
});

const generate_ical = () => {
  const { error, value } = ics.createEvents(events);

  app.get('/', function (req, res) {
    res.writeHead(200, { "Content-Type": "text/calendar" });
    res.end(value);
  })

  app.listen(process.env.SERVER_PORT_ICS, process.env.SERVER_IP, function () {
    console.log(`📣  :: BMF Calendar API running on: http://${process.env.SERVER_IP}:${process.env.SERVER_PORT_ICS}`)
  })
}