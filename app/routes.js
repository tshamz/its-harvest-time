'use strict';

const dummyData = require('./dummy-data.js');

const mongo = require('../database/database.js');
const harvest = require('../harvest/harvest.js');

// const json2csv = require('json2csv');

const responseHandler = function (error) {
  return {
    'status': (error) ? `ERROR: ${error.type}` : 'OK',
    'message': (error) ? error.message : 'Time to get harvesting!'
  }
};

const validateParams = function (params, requiredParams) {
  var isValid = requiredParams.every(function (param) {
    return Object.prototype.hasOwnProperty.call(params, param) && params[param] !== undefined;
  });
  if (!isValid) {
    return false;
  }
  return true;
};

const routes = {
  index: function (req, res) {
    res.json(responseHandler());
  },
  getTime: function (req, res) {
    res.json({'data': harvest.time() });
  },
  getDay: function (req, res) {
    if (!validateParams(req.query, ['date'])) {
      res.json(responseHandler({ type: 'Missing Parameters', message: 'Please include the proper parameters.' }));
      return false;
    }
    mongo.query({ date: req.query.date, collection: 'time' })
    .done(function (item) {
      res.json(item);
    });
  },
  update: function (req, res) {
    if (!validateParams(eq.query, ['date'])) {
      res.json(responseHandler({ type: 'Missing Parameters', message: 'Please include the proper parameters.' }));
      return false;
    }

    let parsedDate = req.query.date.split('-');
    let nativeDate = new Date(parsedDate[0], parseInt(parsedDate[1]) - 1, parsedDate[2]);

    harvest.getEntries(nativeDate)
    .then(function(totals) {
      return {
        document: totals,
        collection: 'time'
      };
    })
    .then(mongo.write)
    .done(function () {
      res.json(responseHandler());
    });
  }
  // getCSV: function(req, res) {
  //   res.attachment('exported-harvest-times.csv');
  //   res.status(200).send(buildCSV());
  // },
};

module.exports = {
  index: routes.index,
  getTime: routes.getTime,
  getDay: routes.getDay,
  update: routes.update
};
