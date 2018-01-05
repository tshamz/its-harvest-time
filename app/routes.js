'use strict';

const json2csv = require('json2csv');
const harvest  = require('../harvest/harvest.js');

const letsGetStarted = (req, res) => res.json({ status: 'OK', message: 'Time to get harvesting!' });
const sendTheReport = async (req, res) => {
  const validParams = ['from', 'to'].every(param => Object.keys(req.query).includes(param));
  if (!validParams) {
    res.json({ status: 'ERROR', message: 'Requests must include both a "to" and "from" parameter' });
  } else {
    const reportData = await harvest.report(req.query);
    if (req.query.format === 'csv') {
      const csv = json2csv({ data: reportData, fieldNames: ['Name', 'Billable Hours', 'Total Hours'] });
      res.attachment('exported-harvest-times.csv');
      res.status(200).send(csv);
    } else {
      res.json({
        "from": req.query.from,
        "to": req.query.to,
        "totals": reportData
      });
    }
  }
};

module.exports = {
  index: letsGetStarted,
  report: sendTheReport
};
