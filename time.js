'use strict';

const Q = require('q');

/**
 * Harvest Integration
 */

const harvest = require('./harvest/harvest.js');

const fetchEmployees = function () {
  harvest.employees();
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
 .done(fetchEmployees);
