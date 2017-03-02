'use strict';

const Q = require('q');
const json2csv = require('json2csv');

const mongo = require('../database/database.js');
const harvest = require('../harvest/harvest.js');

const buildCSV = function (data) {
  var fields = ['name', 'hours.total', 'hours.billable'];
  var fieldNames = ['Name', 'Total Time', 'Billable Time'];
  return json2csv({data: data, fields: fields, fieldNames: fieldNames});
};

const colateDateRangeEntries = function (rawRangeEntries) {
  let monthTotals = {};
  let data = [];
  [].concat.apply([], rawRangeEntries.map(function (day) {
    return day.entries;
  })).forEach(function (entry) {
    if (!monthTotals.hasOwnProperty(entry.id)) {
      monthTotals[entry.id] = {
        name: entry.name,
        id: entry.id,
        department: entry.department,
        hours: {
          billable: 0,
          total: 0
        }
      }
    } else {
      monthTotals[entry.id].hours.billable += entry.hours.billable;
      monthTotals[entry.id].hours.total += entry.hours.total;
    }
  });
  for (let key in monthTotals) {
    data.push(monthTotals[key]);
  }
  return data;
};

const routes = {
  index: function (req, res) {
    res.json({status: 'OK', message: 'Time to get harvesting!'});
  },
  today: function (req, res) {
    if (req.query.department !== undefined) {
      let today = harvest.time()
      let filteredData = today.entries.filter(function (entry) {
        return entry.department === req.query.department;
      });
      res.json({'data': {
        date: today.date,
        filtered_by: [Object.keys(req.query)],
        filter_values: Object.keys(req.query).map(function (key) {return req.query[key]}),
        entries: filteredData
      }});
    } else {
      res.json({'data': harvest.time()});
    }
  },
  day: function (req, res) {
    mongo.query({query: {date: req.query.date}, collection: 'time' })
    .done(function (result) {
      res.json(result);
    });
  },
  month: function (req, res) {
    mongo.query({query: {date: {$regex: `^${req.query.date}`}}, collection: 'time' })
    .then(colateDateRangeEntries)
    .done(function (data) {
      res.json(data);
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
  },
  csvMonth: function(req, res) {
    mongo.query({query: {date: {$regex: `^${req.query.date}`}}, collection: 'time' })
    .then(colateDateRangeEntries)
    .then(buildCSV)
    .done(function (csv) {
      res.attachment('exported-harvest-times.csv');
      res.status(200).send(csv);
    });
  },
};

module.exports = {
  index: routes.index,
  today: routes.today,
  day: routes.day,
  month: routes.month,
  csvMonth: routes.csvMonth,
  update: routes.update
};





