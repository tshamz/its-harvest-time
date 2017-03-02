'use strict';

const dummyData = require('./dummy-data.js');

const Q = require('q');
const mongo = require('../database/database.js');
const harvest = require('../harvest/harvest.js');

const routes = {
  index: function (req, res) {
    res.json({status: 'OK', message: 'Time to get harvesting!'});
  },
  today: function (req, res) {
    res.json({'data': harvest.time() });
  },
  time: function (req, res) {
    mongo.query({query: {date: req.query.date}, collection: 'time' })
    .done(function (result) {
      res.json(result);
    });
  },
  update: function (req, res) {
    if (req.query.date === undefined) {
      res.json({status: 'Error', message: 'Missing Parameters: date'});
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
    .done(function (result) {
      res.json(result);
    });
  }
};

module.exports = {
  index: routes.index,
  today: routes.today,
  time: routes.time,
  update: routes.update
};
