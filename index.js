const express = require('express');
const mongoose = require('mongoose');

const app = express();

//connections
const connect = process.env.CONNECTION_URI;

mongoose.connect(connect, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//ENDPOINTS
app.get('/clubs', (req, res) => {});

const port = 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port: ${port}`);
});
