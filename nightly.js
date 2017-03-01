'use strict';

const Q = require('q');

const harvest = require('./harvest/harvest.js');
const mongo = require('./database/database.js');

const startMongo = function () {
  return mongo.start();
};

Q.fcall(startMongo).done(function () {
  mongo.write({ document: harvest.time(), collection: 'time'});
});
