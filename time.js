'use strict';

const Q = require('q');
const moment = require('moment');
const json2csv = require('json2csv');

/**
 * Harvest Integration
 */

const harvest = require('./harvest/harvest.js');

const startTimeEntryPolling = function () {
  harvest.pollForEntries();
  let entryPollingInterval = setInterval(harvest.pollForEntries, 1000 * 60 * 3);  // 3 minutes
};

/**
 * ExpressJS App
 */

const express = require('./app/app.js');

const startExpress = function () {
  return express.start();
};

/**
 * MongoDB
 */

const mongo = require('./database/database.js');

const startMongo = function () {
  return mongo.start();
};

/**
 * Other Stuff
 */

var buildCSV = function () {
  var fields = ['names.first', 'hours.totalTime', 'hours.billableTime'];
  var fieldNames = ['Name', 'Total Time', 'Billable Time'];
  var sortedData = CalculatedTimes.sort(function (a, b) {
    var nameA = a.names.first.toUpperCase();
    var nameB = b.names.first.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
  return json2csv({data: sortedData, fields: fields, fieldNames: fieldNames});
};

/**
 * Init
 */

Q.fcall(startMongo)
 .then(startExpress)
 .done(startTimeEntryPolling);
