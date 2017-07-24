'use strict';

const Q = require('q');

/**
 * Harvest Integration
 */

const harvest = require('./harvest/harvest.js');

const startTimeEntryPolling = function () {
  harvest.poll()
  .done(function () {
    // console.log('successfully polled for entries.');
  });

  let entryPollingInterval = setInterval(function () {
    harvest.poll()
    .done(function () {
      // console.log('successfully polled for entries.');
    });
  }, 1000 * 60 * 3);  // 3 minutes
};

/**
 * ExpressJS App
 */

const express = require('./app/app.js');

const startExpress = function () {
  return express.start();
};

/**
 * Init
 */

Q.fcall(startExpress)
 .done(startTimeEntryPolling);
