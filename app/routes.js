'use strict';

const json2csv = require('json2csv');
const harvest = require('../harvest/harvest.js')

const routes = {
  index: (req, res) => res.json({ status: 'OK', message: 'Time to get harvesting!' }),
  report: async (req, res) => {
    const validParams = ['from', 'to'].every(param => Object.keys(req.query).includes(param));
    if (!validParams) {
      res.json({ status: 'ERROR', message: 'Requests must include both a "to" and "from" parameter' });
    } else {
      const reportData = await harvest.report(req.query);
      if (req.query.format === 'csv') {
        res.attachment('exported-harvest-times.csv');
        res.status(200).send(json2csv({ data: reportData, fieldNames: ['Name', 'Billable Hours', 'Total Hours'] }));
      } else {
        res.json({
          "from": req.query.from,
          "to": req.query.to,
          "totals": reportData
        });
      }
    }
  }
};

module.exports = {
  index: routes.index,
  report: routes.report
};
