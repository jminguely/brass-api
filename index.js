const express = require('express')
const app = express();
const Airtable = require('airtable');
const dotenv = require('dotenv');
const ics = require('ics');
const moment = require('moment');
const slugify = require('slugify');

dotenv.load();

moment.locale("fr_FR");

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base('appOvGQqOefkMpE9o');

app.use(express.static('public'));

app.get('/', function (req, res) { res.redirect('/agenda');})
app.get('/concerts', function (req, res) { res.redirect('/agenda');})

app.get('/calendar', function (req, res) {
  let events = [];
    base('Concerts').select(
      {
        filterByFormula: `Statut = 'Confirmé'`,
        sort: [{field: 'Date check-in', direction: 'asc'}]
      }
    ).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      const date_start = moment(record.get('Date check-in'));
      const date_end = moment(record.get('Date fin'));
  
      let event = {
        title:              `BMF - ${record.get('Titre') || record.get('Type')}`,
        location:           record.get('Ville'),
        description:        `${record.get('API')}\n\n${record.get('Informations') || ""}`,
        url:                record.get('API'),
      }
  
      if (record.get('Date fin')) {
        event.start =       date_start.format('YYYY-M-D-H-mm').split("-").map(Number);
        event.end =         date_end.format('YYYY-M-D-H-mm').split("-").map(Number);
      } else {
        event.start =       date_start.format('YYYY-M-D').split("-").map(Number);
        event.end =         date_start.format('YYYY-M-D').split("-").map(Number);
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
      view: 'Full'
    }
  ).firstPage();
  
  const effectifs = [];
  const instruments = [];
  const statuts = [];

  musiciens.forEach(musicien => {
    let person = {};

    person = {
      id:           musicien.id,
      nom:          musicien.get('Nom'),
      instrument:  musicien.get('Instrument'),
      phone:        musicien.get('Telephone'),
      statut:       musicien.get('Statut'),
      email:        musicien.get('E-Mail'),
    };

    effectifs.push(person);

    if (instruments.indexOf(musicien.get('Instrument')) === -1) instruments.push(musicien.get('Instrument'));
    if (statuts.indexOf(musicien.get('Statut')) === -1) statuts.push(musicien.get('Statut'));
    
  });

  res.render('musiciens.html.twig', {
    musiciens : effectifs,
    instruments: instruments,
    statuts: statuts,
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
      sort: [{field: 'Date check-in', direction: 'asc'}]
    }
  ).firstPage();

  let gigs = [];
  concerts.forEach(concert => {
    gigs.push({
      id: concert.id,
      date: moment(concert.get('Date check-in')).format("DD.MM.YY"),
      dateSortable: moment(concert.get('Date check-in')).format("x"),
      titre: concert.get("Titre"),
      ville: concert.get("Ville"),
      past: concert.get("Past"),
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
    statut:       musicien.get('Statut'),
    instrument:   musicien.get('Instrument'),
    ddn:          musicien.get('DDN'),
    adresse:      musicien.get('Adresse'),
    regime:       musicien.get('Régime'),
    salaires:     musicien.get('Salaires'),
    phone:        musicien.get('Telephone'),
    email:        musicien.get('E-Mail'),
    gigs:         gigs,
  };

  res.render('musicien.html.twig', {
    musicien : person,
  });
})

app.get('/agenda', async function (req, res) {

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
      sort: [{field: 'Date check-in', direction: 'asc'}]
    }
  ).firstPage();

  concerts.forEach(concert => {
    let nonRepondu = Object.assign({}, nonReponduOriginal);
    let effectifsForDuplicate = [];
    let effectifs = {};
    let event = {};
    Object.keys(concert.fields).forEach(key => {
      if (key.includes('[Musiciens]')) {
        const registre = key.slice(0, -12);
        effectifs[registre] = {};
        musiciens.forEach(musicien => {
          concert.fields[key].forEach(async musicienId => {
            if (musicien.id === musicienId) {
              effectifs[registre][musicienId] = [];
              effectifs[registre][musicienId]['Nom'] = musicien.get('Nom');
              effectifs[registre][musicienId]['Id'] = musicien.id;
              delete nonRepondu[musicien.id];

              if (!effectifsForDuplicate.includes(musicienId)){
                effectifsForDuplicate.push(musicienId);
              } else {
                effectifs[registre][musicienId]['Duplicate'] = true;
              }
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
      statut:       concert.get('Statut'),
      titre:        concert.get('Titre'),
      type:         concert.get('Type'),
      ville:         concert.get('Ville'),
      informations: concert.get('Informations'),
      date:        moment(concert.get('Date check-in')).format("DD.MM.YY"),
      dateSortable:        moment(concert.get('Date check-in')).format("x"),
      time:         moment(concert.get('Date check-in')).format('HH:mm'),
      effectifs:    effectifs,
      nonRepondu:   nonRepondu
    };
    events.push(event);
  });

  res.render('agenda.html.twig', {
    events : events,
    layout : 'futur'
  });
})

app.get('/agenda/:concert_id', async function (req, res) {
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
    const registre = key.slice(0, -12);
    effectifs[registre] = {};
    musiciens.forEach(musicien => {
      concert.fields[key].forEach(async musicienId => {
        if (musicien.id === musicienId) {
          effectifs[registre][musicienId] = [];
          effectifs[registre][musicienId]['Nom'] = musicien.get('Nom');
          effectifs[registre][musicienId]['Mail'] = musicien.get('E-Mail');
          effectifs[registre][musicienId]['Regime'] = musicien.get('Régime');
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
    commentaires: concert.get('Commentaires internes'),
    start:        concert.get('Date check-in'),
    end:          concert.get('Date fin'),
    effectifs:    effectifs,
    nonRepondu:   nonRepondu
  };
  res.render('event.html.twig', {
    event : event,
  });
})

app.get('/salaires/:salaire_id', function (req, res) {
  const salaire_id = req.params.salaire_id;

  base('Salaires').select({filterByFormula: `RECORD_ID() = '${salaire_id}'`}).eachPage(function page(salaires, fetchNextPage) {
    
    salaire = salaires[0];

    let data = {
      name:           slugify(salaire.get('Name')),
      dateDebut:      moment(salaire.get('Date début')).format("DD.MM.YY"),
      dateFin:        moment(salaire.get('Date fin')).format("DD.MM.YY"),
      defraiement:    salaire.get('Défraiement'),
      qtyConcerts:    salaire.get('Quantité de concerts'),
      qtyRepetitions: salaire.get('Quantité de répétitions'),
      prixConcert:    salaire.get('Prix concert'),
      prixRepetition: salaire.get('Prix répétition'),
      montant:        salaire.get('Montant'),
      musicien:       {}
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