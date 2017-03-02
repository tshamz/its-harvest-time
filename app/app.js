'use strict';

const Q = require('q');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const router = express.Router();
const routes = require('./routes.js');

const table = require('table');
const chalk = require('chalk');

app.set('port', process.env.PORT || 5000);

app.use(router);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

router.all('*', function(req, res, next){
  if (!req.get('Origin')) {
    return next();
  }
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) {
    return res.send(200);
  }
  next();
});

// API routes
router.get('/', routes.index);
router.get('/api/today', routes.today);
router.get('/api/time', routes.time);
router.get('/api/update', routes.update);

app.use(function(req, res, next){  // if route not found, respond with 404
  const jsonData = {
    status: 'ERROR',
    message: 'Sorry, we cannot find the requested URI'
  };
  res.status(404).send(jsonData);  // set status as 404 and respond with data
});

const displayRoutes = function () {
  const config = {
    columns: {
      0: { alignment: 'left', paddingRight: 2 },
      1: { alignment: 'left' },
      2: { alignment: 'left' }
    },
    border: {
        topBody: chalk.white(`=`),
        topJoin: chalk.white(`╤`),
        topLeft: chalk.white(`╔`),
        topRight: chalk.white(`╗`),

        bottomBody: chalk.white(`=`),
        bottomJoin: chalk.white(`╧`),
        bottomLeft: chalk.white(`╚`),
        bottomRight: chalk.white(`╝`),

        bodyLeft: chalk.white(`║`),
        bodyRight: chalk.white(`║`),
        bodyJoin: chalk.white(`│`),

        joinBody: chalk.white(`─`),
        joinLeft: chalk.white(`╟`),
        joinRight: chalk.white(`╢`),
        joinJoin: chalk.white(`┼`)
    }
  };
  let data = [[chalk.white.bold('Method'), chalk.white.bold('Path'), chalk.white.bold('Handler')]];
  router.stack.forEach(function (layer) {
    if (layer.route.path !== '*') {
      let methodName = layer.route.stack[0].method.toUpperCase();
      let method = (methodName === 'GET') ? chalk.green(methodName) : chalk.yellow(methodName);
      let path = layer.route.path;
      let handler = `routes.${layer.route.stack[0].name}`;
      data.push([method, path, handler]);
    }
  });
  console.log(table.table(data, config));
};

const createExpressServer = function () {
  return Q.Promise(function (resolve, reject, notify) {
    http.createServer(app).listen(app.get('port'), function() {
      console.log('Express server listening on port ' + app.get('port'));
      displayRoutes();
      resolve();
    });
  });
};

module.exports = {
  start: createExpressServer
};
