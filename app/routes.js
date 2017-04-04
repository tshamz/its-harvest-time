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
        isActive: entry.isActive,
        isBillable: entry.isBillable,
        hours: {
          billable: 0,
          total: 0
        }
      }
    } else {
      monthTotals[entry.id].hours.billable += entry.hours.billable;
      monthTotals[entry.id].hours.total += entry.hours.total;
      if (entry.isActive) {
        monthTotals[entry.id].isActive = true;
      }
      if (entry.isBillable) {
        monthTotals[entry.id].isBillable = true;
      }
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
      res.json({date: today.date, filtered_by: Object.keys(req.query), entries: filteredData});
    } else {
      res.json(harvest.time());
    }
  },
  day: function (req, res) {
    mongo.query({query: {date: req.query.date}, collection: 'time'})
    .done(function (result) {
      let data = result[0];
      if (req.query.department !== undefined) {
        let filteredData = data.entries.filter(function (entry) {
          return entry.department === req.query.department;
        });
        res.json({date: data.date, filtered_by: Object.keys(req.query), entries: filteredData});
      } else {
        res.json(data);
      }
    });
  },
  week: function (req, res) {
    let today = new Date;
    let todaysData = harvest.time();
    let dates = []
    for (let i = today.getDay() - 1; i > 0; i--) {
      let date = new Date(today.getFullYear(), today.getMonth(), (today.getDate() - i), 12, 0, 0);
      dates.push(date.toISOString().split('T')[0]);
    };
    mongo.query({query: {date: {$in: dates}}, collection: 'time'})
    .then(function (result) {
      return result.concat(todaysData);
    })
    .then(colateDateRangeEntries)
    .done(function (result) {
      if (req.query.department !== undefined) {
        let filteredData = result.filter(function (entry) {
          return entry.department === req.query.department;
        });
        res.json({week_starting_on: dates[0], filtered_by: Object.keys(req.query), entries: filteredData});
      } else {
        res.json({week_starting_on: dates[0], filtered_by: Object.keys(req.query), entries: result});
      }
    });
  },
  month: function (req, res) {
    mongo.query({query: {date: {$regex: `^${req.query.date}`}}, collection: 'time'})
    .then(colateDateRangeEntries)
    .done(function (result) {
      if (req.query.department !== undefined) {
        let filteredData = result.filter(function (entry) {
          return entry.department === req.query.department;
        });
        res.json({month_starting_on: `${req.query.date}-01`, filtered_by: Object.keys(req.query), entries: filteredData});
      } else {
        res.json({month_starting_on: `${req.query.date}-01`, filtered_by: Object.keys(req.query), entries: result});
      }
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
  csvMonth: function (req, res) {
    mongo.query({query: {date: {$regex: `^${req.query.date}`}}, collection: 'time' })
    .then(colateDateRangeEntries)
    .then(buildCSV)
    .done(function (csv) {
      res.attachment('exported-harvest-times.csv');
      res.status(200).send(csv);
    });
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
  day: routes.day,
  week: routes.week,
  month: routes.month,
  csvMonth: routes.csvMonth,
  update: routes.update,
  report: routes.report
};
