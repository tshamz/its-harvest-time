'use strict';

const Q = require('q');

const harvest = require('./harvest/harvest.js');
const mongo = require('./database/database.js');

mongo.write({ document: harvest.time, collection: 'time'});
