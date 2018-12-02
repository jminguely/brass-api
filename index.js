const express = require('express')
const app = express();
const Airtable = require('airtable');
const dotenv = require('dotenv').load();
const Twig = require("twig");
const ics = require('ics');
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

app.get('/calendar', function (req, res) {
  let events = [];
  base('Concerts').select().eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      const date_start = moment(record.get('Date check-in'));
      const date_end = moment(record.get('Date fin'));
  
      let event = {
        title:              `BMF - ${record.get('Titre') || record.get('Type')}`,
        location:           record.get('Ville'),
        description:        `${record.get('Export')}\n\n${record.get('Informations') || ""}`,
        url:                record.get('Export'),
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
  
    const { error, value } = ics.createEvents(events);
    req.is('text/calendar')
    res.send(value);
  
  }, function done(err) {
    if (err) { console.error(err); return; }
  });
})

app.get('/concerts/:concert_id', async function (req, res) {
  const concert_id = req.params.concert_id;

  const musiciens = await base('Musiciens').select().firstPage();

  const effectifs = {};

  const concerts = await base('Concerts').select({filterByFormula: `RECORD_ID() = '${concert_id}'`}).firstPage();
  concerts.forEach(concert => {
  Object.keys(concert.fields).forEach(key => {
  if (key.includes('[Musiciens]')) {
    const trimKey = key.slice(0, -12);
    effectifs[trimKey] = {};
    concert.fields[key].forEach(async musicienId => {
      musiciens.forEach(musicien => {
        if (musicien.id === musicienId) {
          effectifs[trimKey][musicienId] = [];
          effectifs[trimKey][musicienId]['Nom'] = musicien.get('Nom');
        }
      });
    });
  }});

    const event = {
    type:         concert.get('Type'),
      title:        concert.get('Titre'),
      city:         concert.get('Ville'),
      informations: concert.get('Informations'),
      start:        moment(concert.get('Date check-in')).format('LLLL'),
      end:          moment(concert.get('Date fin')).format('LLLL'),
      effectifs:    effectifs
    };
    res.render('concerts.html.twig', {
      event : event,
    });
  });
})

app.get('/salaires/:salaire_id', function (req, res) {
  const salaire_id = req.params.salaire_id;

  base('Salaires').select({filterByFormula: `RECORD_ID() = '${salaire_id}'`}).eachPage(function page(salaires, fetchNextPage) {
    
    salaire = salaires[0];

    let data = {
      name:         salaire.get('Name'),
      nombre:       salaire.get('Nombre d\'engagmenet'),
      montant:      salaire.get('Montant'),
      musicien:     {}
    };

    base('Musiciens').select({filterByFormula: `RECORD_ID() = '${salaire.get('Musicien')[0]}'`}).eachPage((musiciens) => {
      data.musicien.nom = musiciens[0].get('Nom');
      data.musicien.adresse = musiciens[0].get('Adresse');
      data.musicien.iban = musiciens[0].get('IBAN');
    });

    setTimeout(() => {
      res.render('salaires.html.twig', {
        salaire : data,
      });  
    }, 1000);


    fetchNextPage();
  
  }, function done(err) {
    if (err) { console.error(err); return; }
  });
})

app.listen(process.env.SERVER_PORT, process.env.SERVER_IP, function () {
  console.log(`BMF API server on: http://${process.env.SERVER_IP}:${process.env.SERVER_PORT}`)
})