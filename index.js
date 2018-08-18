const express = require('express')
const app = express();
const Airtable = require('airtable');
const dotenv = require('dotenv').load();
const Twig = require("twig");
const moment = require('moment');
moment.locale("fr_FR");

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base('appOvGQqOefkMpE9o');

app.get('/', function (req, res) {
  res.send('It Works')
})

app.get('/concerts/:concert_id', function (req, res) {
  const concert_id = req.params.concert_id;

  base('Concerts').select({filterByFormula: `RECORD_ID() = '${concert_id}'`}).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      const event = {
        type:         record.get('Type'),
        title:        record.get('Titre'),
        city:         record.get('Ville'),
        informations: record.get('Informations'),
        start:        moment(record.get('Date check-in')).format('LLLL'),
        end:          moment(record.get('Date fin')).format('LLLL'),
      };
      res.render('index.html.twig', {
        event : event,
      });
    });
  
    fetchNextPage();
  
  }, function done(err) {
    if (err) { console.error(err); return; }
  });
})

app.listen(process.env.SERVER_PORT, process.env.SERVER_IP, function () {
  console.log(`BMF API server on: https://${process.env.SERVER_IP}:${process.env.SERVER_PORT}`)
})