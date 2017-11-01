'use strict';

const json2csv = require('json2csv');
const harvest = require('../harvest/harvest.js')

const routes = {
  index: (req, res) => res.json({status: 'OK', message: 'Time to get harvesting!'}),
  report: (req, res) => {
    let missingParams = ['from', 'to'].filter(param => Object.keys(req.query).indexOf(param) === -1);
    if (missingParams.length > 0) {
      res.json({status: 'ERROR', message: `Missing required params: ${missingParams.join(', ')}`});
    } else {
      harvest.report(req.query)
      .then(report => {
        if (req.query.format === 'csv') {
          res.attachment('exported-harvest-times.csv');
          res.status(200).send(json2csv({data: report, fieldNames: ['Name', 'Billable Hours', 'Total Hours']}));
        } else {
          res.json({
            "from": req.query.from,
            "to": req.query.to,
            "totals": report
          });
        }
      });
    }
  }
};

module.exports = {
  index: routes.index,
  report: routes.report
};
