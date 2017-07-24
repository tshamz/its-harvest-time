'use strict';

const Q = require('q');

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

startExpress();
