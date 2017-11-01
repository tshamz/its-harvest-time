'use strict';

const Q = require('q');
const json2csv = require('json2csv');

const harvest = require('../harvest/harvest.js')

const routes = {
  index: function (req, res) {
    res.json({status: 'OK', message: 'Time to get harvesting!'});
  },
  report: function (req, res) {
    let missingParams = ['from', 'to'].filter(function (param) {
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
          const json = {
            "from": req.query.from,
            "to": req.query.to,
            "totals": report
          };

          res.json(json);
        }
      });
    }
  }
};

module.exports = {
  index: routes.index,
  report: routes.report
};

