const express = require('express')
const app = express()

let SERVER_PORT = 8101;
let SERVER_IP = "0.0.0.0";

console.log(process.env.NODE_ENV);
console.log('No value for FOO yet:', process.env.FOO);

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
  SERVER_PORT = "127.0.0.1";
  SERVER_IP = 3000;
}

console.log('Now the value for FOO is:', process.env.FOO);

app.get('/', function (req, res) {
  res.send('Hello World! TEST', process)
})

app.listen(SERVER_PORT, SERVER_IP, function () {
  console.log(`Example app listening on: ${SERVER_IP}:${SERVER_PORT}`)
})
