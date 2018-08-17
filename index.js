const express = require('express')
const app = express()
require('dotenv').load();

console.log(process.env.SERVER_PORT);
console.log(process.env.SERVER_IP);

app.get('/', function (req, res) {
  res.send('Hello World! TEST')
})

app.listen(process.env.SERVER_PORT, process.env.SERVER_IP, function () {
  console.log(`Example app listening on: ${process.env.SERVER_IP}:${process.env.SERVER_PORT}`)
})
