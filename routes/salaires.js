const express = require('express');
const router = express.Router();
const moment = require("moment");
const slugify = require("slugify");
moment.locale("fr_FR");
const base = require('../config/airtable');

router.get("/salaires/:salaire_id", async function (req, res) {
  const salaire_id = req.params.salaire_id;

  const salaires = await base("Salaires").select({ filterByFormula: `RECORD_ID() = '${salaire_id}'` }).firstPage();

  salaire = salaires[0];

  let data = {
    fields: salaire.fields,
    name: slugify(salaire.fields.Name),
    dateDebut: moment(salaire.fields["Date début"]).format("DD.MM.YY"),
    dateFin: moment(salaire.fields["Date fin"]).format("DD.MM.YY"),
    musicien: {},
  };

  const musiciens = await base("Musiciens").select({ filterByFormula: `RECORD_ID() = '${salaire.fields.Musicien[0]}'` }).firstPage();

  const musicien = musiciens[0];

  data.musicien.nom = musicien.fields.Nom;
  data.musicien.adresse = musicien.fields.Adresse;
  data.musicien.iban = musicien.fields.IBAN;
  data.musicien.npaville = musicien.fields["NPA/Ville"];

  res.render("salaires.html.twig", {
    salaire: data,
  });
});

module.exports = router;
