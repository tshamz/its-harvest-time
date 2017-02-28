'use strict';

const dummyData = require('./dummy-data.js');

const routes = {
  index: function(req, res) {
    let data = {
      status: 'OK',
      message: 'Time to get harvesting!'
    };
    res.json(data);
  },
  getTime: function(req, res) {
    res.json({'data': dummyData.data});
  },
  // getCSV: function(req, res) {
  //   res.attachment('exported-harvest-times.csv');
  //   res.status(200).send(buildCSV());
  // },
};

module.exports = {
  index: routes.index,
  getTime: routes.getTime
};
