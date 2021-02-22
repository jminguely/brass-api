const express = require('express')
const app = express();
const AsyncAirtable = require('asyncairtable');
const dotenv = require('dotenv');
const ics = require('ics');
const moment = require('moment');
const slugify = require('slugify');
const minifyHTML = require('express-minify-html');

dotenv.config();

moment.locale("fr_FR");

const asyncAirtable = new AsyncAirtable(process.env.AIRTABLE_API_KEY, 'appOvGQqOefkMpE9o');

app.use(express.static('public'));

function formatDate(startDate, endDate) {
  let date = "";
  if (startDate.isSame(endDate, 'day')) {
    date = `
        ${startDate.format("DD.MM.YYYY")}<br/>
        ${startDate.format("HH:mm")}—${endDate.format("HH:mm")}
      `;
  } else {
    date = `
        ${startDate.format("DD.MM.YYYY, HH:mm")} — <br/>
        ${endDate.format("DD.MM.YYYY, HH:mm")}
      `;
  }
  return date;
}

app.use(minifyHTML({
  override: true,
  exception_url: false,
  htmlMinifier: {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    minifyJS: true
  }
}));

app.get('/', function (req, res) { res.redirect('/agenda');})
app.get('/concerts', function (req, res) { res.redirect('/agenda');})

app.get('/calendar', async function (req, res) {
  let events = [];

  const concerts = await asyncAirtable.select('Concerts', {
    sort: [{ field: 'Date check-in', direction: 'asc' }],
    where: {
      $or: [
        { Statut: 'Confirmé' },
        { Statut: 'Booking' }
      ]
    }
  });

  concerts.forEach(function(concert) {
    const date_start = moment(concert.fields['Date check-in']);
    const date_end = moment(concert.fields['Date fin']);

    let event = {
      title:              `BMF - ${concert.fields['Titre'] || concert.fields['Type']}`,
      location:           concert.fields['Ville'],
      description:        `${concert.fields['API']}\n\n${concert.fields['Informations'] || ""}`,
      url:                concert.fields['API'],
    }

    if (concert.fields['Date fin']) {
      event.start =       date_start.format('YYYY-M-D-H-mm').split("-").map(Number);
      event.end =         date_end.format('YYYY-M-D-H-mm').split("-").map(Number);
    } else {
      event.start =       date_start.format('YYYY-M-D').split("-").map(Number);
      event.end =         date_start.format('YYYY-M-D').split("-").map(Number);
    }

    events.push(event);

  });

  const { error, value } = ics.createEvents(events);
  req.is('text/calendar')
  res.send(value);
})

app.get('/musiciens', async function (req, res) {
  const musiciens = await asyncAirtable.select('Musiciens');

  const effectifs = [];
  const instruments = [];
  const statuts = [];

  musiciens.forEach(musicien => {
    let person = {};

    person = {
      id:           musicien.id,
      fields:       musicien.fields,
    };

    effectifs.push(person);

    if (instruments.indexOf(musicien.fields['Instrument']) === -1) instruments.push(musicien.fields['Instrument']);
    if (statuts.indexOf(musicien.fields['Statut']) === -1) statuts.push(musicien.fields['Statut']);

  });

  res.render('musiciens.html.twig', {
    musiciens : effectifs,
    instruments: instruments,
    statuts: statuts,
  });
})

app.get('/musiciens/:musicien_id', async function (req, res) {
  const musicien_id = req.params.musicien_id;

  const musiciens = await asyncAirtable.select('Musiciens', { filterByFormula: `RECORD_ID() = '${musicien_id}'` });
  musicien = musiciens[0];

  const concerts = await asyncAirtable.select('Concerts', {
    sort: [{ field: 'Date check-in', direction: 'asc' }]
  });

  let gigs = [];
  concerts.forEach(concert => {
    gigs.push({
      id: concert.id,
      date: moment(concert.fields['Date check-in']).format("DD.MM.YY"),
      dateSortable: moment(concert.fields['Date check-in']).format("x"),
      titre: concert.fields["Titre"],
      ville: concert.fields["Ville"],
      past: concert.fields["Past"],
      statut: "???",
    });
  });

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
    fields:       musicien.fields,
    gigs:         gigs,
  };

  res.render('musicien.html.twig', {
    musicien : person,
  });
})

app.get('/agenda', async function (req, res) {
  const musiciens = await asyncAirtable.select('Musiciens', {
    where: {
      $or: [
        { Statut: 'Remplaçant' },
        { Statut: 'Titulaire' }
      ]
    }
  });

  let nonReponduOriginal = {};
  musiciens.forEach(musicien => {
    nonReponduOriginal[musicien.id] = musicien.fields.Nom;
  });

  let events = [];

  const concerts = await asyncAirtable.select('Concerts', {
    sort: [{ field: 'Date check-in', direction: 'asc' }]
  });

  concerts.forEach(concert => {
    let nonRepondu = Object.assign({}, nonReponduOriginal);
    let effectifsForDuplicate = [];
    let effectifs = {};
    let gig = {};
    Object.keys(concert.fields).forEach(key => {
      if (key.includes('[Musiciens]')) {
        const registre = key.slice(0, -12);
        effectifs[registre] = {};
        musiciens.forEach(musicien => {
          concert.fields[key].forEach(async musicienId => {
            if (musicien.id === musicienId) {
              effectifs[registre][musicienId] = [];
              effectifs[registre][musicienId]['Nom'] = musicien.fields.Nom;
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

    const startDate = moment(concert.fields['Date check-in']);
    const endDate   = moment(concert.fields['Date fin']);

    let date = formatDate(startDate, endDate);

    gig = {
      id:           concert.id,
      fields:       concert.fields,
      date:         date,
      dateSortable: startDate.format("x"),
      effectifs:    effectifs,
      nonRepondu:   nonRepondu
    };
    events.push(gig);
  });

  res.render('agenda.html.twig', {
    events : events,
    layout : 'futur'
  });
})

app.get('/agenda/:concert_id', async function (req, res) {
  const concert_id = req.params.concert_id;

  const musiciens = await asyncAirtable.select('Musiciens', {
    where: {
      $or: [
        { Statut: 'Remplaçant' },
        { Statut: 'Titulaire' }
      ]
    }
  });

  let nonReponduOriginal = {};

  musiciens.forEach(musicien => {
    nonReponduOriginal[musicien.id] = musicien.fields.Nom;
  });

  const effectifs = {};

  const concerts = await asyncAirtable.select('Concerts', { filterByFormula: `RECORD_ID() = '${concert_id}'` });

  const concert = concerts[0];

  let nonRepondu = Object.assign({}, nonReponduOriginal);

  Object.keys(concert.fields).forEach(key => {
  if (key.includes('[Musiciens]')) {
    const registre = key.slice(0, -12);
    effectifs[registre] = {};
    musiciens.forEach(musicien => {
      concert.fields[key].forEach(async musicienId => {
        if (musicien.id === musicienId) {
          effectifs[registre][musicienId] = [];
          effectifs[registre][musicienId]['Nom'] = musicien.fields['Nom'];
          effectifs[registre][musicienId]['Mail'] = musicien.fields['E-Mail'];
          effectifs[registre][musicienId]['Regime'] = musicien.fields['Régime'];
          delete nonRepondu[musicien.id];
        }
      });
      if (musicien.fields.Statut == "Remplaçant") {
        delete nonRepondu[musicien.id];
      }
    });
  }});

  const startDate = moment(concert.fields['Date check-in']);
  const endDate = moment(concert.fields['Date fin']);

  const event = {
    fields:       concert.fields,
    date:         formatDate(startDate, endDate),
    effectifs:    effectifs,
    nonRepondu:   nonRepondu
  };
  res.render('event.html.twig', {
    event : event,
  });
})

app.get('/salaires/:salaire_id', async function (req, res) {
  const salaire_id = req.params.salaire_id;

  const salaires = await asyncAirtable.select('Salaires', { filterByFormula: `RECORD_ID() = '${salaire_id}'` });

  salaire = salaires[0];

  let data = {
    fields:         salaire.fields,
    name:           slugify(salaire.fields.Name),
    dateDebut:      moment(salaire.fields['Date début']).format("DD.MM.YY"),
    dateFin:        moment(salaire.fields['Date fin']).format("DD.MM.YY"),
    musicien:       {}
  };

  const musiciens = await asyncAirtable.select('Musiciens', { filterByFormula: `RECORD_ID() = '${salaire.fields.Musicien[0]}'` });

  const musicien = musiciens[0];

  data.musicien.nom = musicien.fields.Nom;
  data.musicien.adresse = musicien.fields.Adresse;
  data.musicien.iban = musicien.fields.IBAN;

  res.render('salaires.html.twig', {
    salaire : data,
  });

})

app.listen(process.env.PORT, process.env.IP, function () {
  console.log(`BMF API server on: http://${process.env.IP}:${process.env.PORT}`)
})
