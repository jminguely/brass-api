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
  res.render('home.html.twig');
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

app.get('/musiciens', async function (req, res) {
  const musiciens = await base('Musiciens').select(
    {
      view: 'Full',
      filterByFormula: `Statut = 'Titulaire'`
    }
  ).firstPage();
  
  const effectifs = [];

  musiciens.forEach(musicien => {
    let events = {};
    let person = {};

    person = {
      id:           musicien.id,
      nom:          musicien.get('Nom'),
      instruments:  musicien.get('Instrument(s)'),
      phone:        musicien.get('Telephone'),
      email:        musicien.get('E-Mail'),      
    };
    effectifs.push(person);
  });

  res.render('musiciens.html.twig', {
    musiciens : effectifs,
  });
})

app.get('/musiciens/:musicien_id', async function (req, res) {
  const musicien_id = req.params.musicien_id;

  const musiciens = await base('Musiciens').select(
    {
      view: 'Full',
      filterByFormula: `RECORD_ID() = '${musicien_id}'`
    }
  ).firstPage();

  const concerts = await base('Concerts').select(
    {
      filterByFormula: `Statut = 'Futur'`,
      sort: [{field: 'Date check-in', direction: 'asc'}]
    }
  ).firstPage();

  let gigs = [];
  concerts.forEach(concert => {
    gigs.push({
      id: concert.id,
      date: moment(concert.get('Date check-in')).format("DD.MM.YY"),
      titre: concert.get("Titre"),
      statut: "???",
    });
  });

  musicien = musiciens[0];


  Object.keys(musicien.fields).forEach(key => {
      if (key.includes('Concerts')) {

        musicien.fields[key].forEach(async concertId => {
          gigs.forEach(async (gig, index) => {
            if (concertId === gig.id){
              if(key.includes('absent')) {
                gigs[index]['statut'] = "Absent"
              }else {
                gigs[index]['statut'] = "Présent"
              }
            }
          })
        });
      
      }
  })

  
  let person = {};

  person = {
    id:           musicien.id,
    nom:          musicien.get('Nom'),
    instruments:  musicien.get('Instrument(s)'),
    phone:        musicien.get('Telephone'),
    email:        musicien.get('E-Mail'),
    gigs:         gigs,
  };

  res.render('musicien.html.twig', {
    musicien : person,
  });
})

app.get('/concerts', async function (req, res) {

  const musiciens = await base('Musiciens').select(
    {
      filterByFormula: `OR(
        Statut = 'Remplaçant',
        Statut = 'Titulaire'
      )
    `
    }
  ).firstPage();

  let nonReponduOriginal = {};
  musiciens.forEach(musicien => {
    nonReponduOriginal[musicien.id] = musicien.get('Nom');
  });
  
  let events = [];

  const concerts = await base('Concerts').select(
    {
      filterByFormula: `Statut = 'Futur'`,
      sort: [{field: 'Date check-in', direction: 'asc'}]
    }
  ).firstPage();

  concerts.forEach(concert => {
    let nonRepondu = Object.assign({}, nonReponduOriginal);
    let effectifs = {};
    let event = {};
    Object.keys(concert.fields).forEach(key => {
      if (key.includes('[Musiciens]')) {
        const trimKey = key.slice(0, -12);
        effectifs[trimKey] = {};
        musiciens.forEach(musicien => {
          concert.fields[key].forEach(async musicienId => {
            if (musicien.id === musicienId) {
              effectifs[trimKey][musicienId] = [];
              effectifs[trimKey][musicienId]['Nom'] = musicien.get('Nom');
              delete nonRepondu[musicien.id];
            }
          });
          if (musicien.fields.Statut == "Remplaçant") {
            delete nonRepondu[musicien.id];
          }
        });
      }
    });

    event = {
      id:           concert.id,
      title:        concert.get('Titre'),
      type:         concert.get('Type'),
      city:         concert.get('Ville'),
      informations: concert.get('Informations'),
      start:        moment(concert.get('Date check-in')).format("DD.MM.YY"),
      time:         moment(concert.get('Date check-in')).format('HH:mm'),
      effectifs:    effectifs,
      nonRepondu:   nonRepondu
    };
    events.push(event);
  });

  res.render('concerts.html.twig', {
    events : events,
  });
})

app.get('/concerts/:concert_id', async function (req, res) {
  const concert_id = req.params.concert_id;

  const musiciens = await base('Musiciens').select(
    {
      filterByFormula: `OR(
        Statut = 'Remplaçant',
        Statut = 'Titulaire'
      )
    `
    }
  ).firstPage();

  let nonReponduOriginal = {};
  musiciens.forEach(musicien => {
    nonReponduOriginal[musicien.id] = musicien.get('Nom');
  });
  
  const effectifs = {};

  const concerts = await base('Concerts').select({filterByFormula: `RECORD_ID() = '${concert_id}'`}).firstPage();
  concert = concerts[0];

  let nonRepondu = Object.assign({}, nonReponduOriginal);
  Object.keys(concert.fields).forEach(key => {
  if (key.includes('[Musiciens]')) {
    const trimKey = key.slice(0, -12);
    effectifs[trimKey] = {};
    musiciens.forEach(musicien => {
      concert.fields[key].forEach(async musicienId => {
        if (musicien.id === musicienId) {
          effectifs[trimKey][musicienId] = [];
          effectifs[trimKey][musicienId]['Nom'] = musicien.get('Nom');
          delete nonRepondu[musicien.id];
        }
      });
      if (musicien.fields.Statut == "Remplaçant") {
        delete nonRepondu[musicien.id];
      }
    });
  }});

  const event = {
    type:         concert.get('Type'),
    address:      concert.get('Adresse'),
    title:        concert.get('Titre'),
    city:         concert.get('Ville'),
    cachet:       concert.get('Cachet'),
    documents:    concert.get('Feuille de route'),
    informations: concert.get('Informations'),
    start:        moment(concert.get('Date check-in')).format('LLLL'),
    end:          moment(concert.get('Date fin')).format('LLLL'),
    effectifs:    effectifs,
    nonRepondu:   nonRepondu
  };
  res.render('concert.html.twig', {
    event : event,
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