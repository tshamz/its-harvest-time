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

const routes = {
  index: function (req, res) {
    res.json(responseHandler());
  },
  getTime: function (req, res) {
    res.json({'data': harvest.time});
  },
  update: function (req, res) {
    let isValid = Object.prototype.hasOwnProperty.call(req.query, 'date');
    if (!isValid) {
      res.json(responseHandler({ type: 'Invalid URL', message: 'Please include a `date=YYYY-MM-DD` query parameter' }));
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
      console.log(harvest.time());
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
  update: routes.update
};
