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
      res.render('concerts.html.twig', {
        event : event,
      });
    });
  
    fetchNextPage();
  
  }, function done(err) {
    if (err) { console.error(err); return; }
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
      console.log(musiciens[0]);
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
  console.log(`BMF API server on: https://${process.env.SERVER_IP}:${process.env.SERVER_PORT}`)
})