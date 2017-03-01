'use strict';

const Q = require('q');

const harvest = require('./harvest/harvest.js');
const mongo = require('./database/database.js');

harvest.poll()
.done(function (totals) {
  mongo.write({ document: totals, collection: 'time'})
});
