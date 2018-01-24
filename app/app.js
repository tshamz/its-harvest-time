'use strict';

const http           = require('http');
const express        = require('express');
const bodyParser     = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const router = express.Router();
const routes = require('./routes.js');

app.set('port', process.env.PORT || 5000);

app.use(router);
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

router.all('*', (req, res, next) => {
  if (!req.get('Origin')) return next();
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});

// API routes
router.get('/', routes.index);
router.get('/api/report', routes.report);

app.use((req, res, next) => {
  const jsonData = { status: 'ERROR', message: 'Sorry, we cannot find the requested URI' };
  res.status(404).send(jsonData);
});

const createExpressServer = () => {
  return new Promise((resolve, reject) => {
    http.createServer(app).listen(app.get('port'), () => {
      console.log('Express server listening on port ' + app.get('port'));
      console.log('\n\nHIIIIIIIIII!\n\n');
      resolve();
    });
  });
};

module.exports = {
  start: createExpressServer
};
