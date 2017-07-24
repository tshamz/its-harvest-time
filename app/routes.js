'use strict';

const Q = require('q');
const json2csv = require('json2csv');

const harvest = require('../harvest/harvest.js');

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
      res.json({date: today.date, filtered_by: Object.keys(req.query), entries: filteredData});
    } else {
      res.json(harvest.time());
    }
  },
  report: function (req, res) {
    let missingParams = ['from', 'to', 'department'].filter(function (param) {
      return Object.keys(req.query).indexOf(param) === -1;
    });
    if (missingParams.length > 0) {
      res.json({status: 'ERROR', message: `Missing required params: ${missingParams.join(', ')}`});
    } else {
      harvest.report(req.query)
      .then(function (report) {
        if (req.query.format === 'csv') {
          let csv = json2csv({data: report, fieldNames: ['Name', 'Billable Hours', 'Total Hours']});
          res.attachment('exported-harvest-times.csv');
          res.status(200).send(csv);
        } else {
          res.json(report);
        }
      });
    }
  }
};

module.exports = {
  index: routes.index,
  today: routes.today,
  report: routes.report
};
