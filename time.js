var Q                 = require('q');
var http              = require('http');
var path              = require('path');
var Harvest           = require('harvest');
var moment            = require('moment');
var express           = require('express');
var bodyParser        = require('body-parser');
var methodOverride    = require('method-override');

/**
 * Harvest Integration
 */

var harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password
});

var TimeTracking = harvest.TimeTracking;
var People = harvest.People;
var Entries = [];
var Developers = {};

var getTimeEntry = function (developer, day) {
  var deferred = Q.defer();
  var today = new Date();
  TimeTracking.daily({date: day, of_user: developerId}, function (err, data) {
    if (err) {
      console.log('err');
      deferred.reject(new Error(error));
    } else {
      Developers[developer.user.id].entries = Developers[developer.user.id].entries.concat(data.day_entries);
      if (day.getDay() === today.getDay()) {
        Developers[developer.user.id].active = data.day_entries.some(function (entry) {
          return entry.hasOwnProperty('timer_started_at');
        });
      }
      deferred.resolve();
    }
  });
  return deferred.promise;
};

var getTimeEntries = function(developers) {
  var promises = [];
  var tuesday = new Date(2017, 1, 7, 12, 0, 0);
  var today = new Date();
  var days = [today, tuesday];
  developers.forEach(function (developer) {
    promises.push(getTimeEntry(developer));
  });
  return Q.all(promises);
};

var getDevelopers = function () {
  var deferred = Q.defer();
  People.list({}, function (err, people) {
    if (err) {
      deferred.reject(new Error(err));
    } else {
      var developers = people.filter(function (data) {
        return data.user.department.toLowerCase().indexOf('development') !== -1 && data.user.is_active;
      }).forEach(function (developer) {
        Developers[developer.user.id] = {
          name: {
            first: developer.user.first_name.toLowerCase(),
            last: developer.user.last_name.toLowerCase(),
            name: developer.user.first_name.toLowerCase() + ' ' + developer.user.last_name.toLowerCase()
          },
          entries: [],
          active: false
        }
        deferred.resolve(developers);
      });
    }
  });
  return deferred.promise;
};



/**
 * ExpressJS App
 */

var app = express();
app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

/**
 * CORS support for AJAX requests
 */

app.all('*', function(req, res, next){
  if (!req.get('Origin')) return next();
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});

/**
 * ROUTES
 */

var getBillableStatus = function(projects, entry) {
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id == entry.project_id) {
      for (var n = 0; n < projects[i].tasks.length; n++) {
        if (projects[i].tasks[n].id == entry.task_id) {
          return projects[i].tasks[n].billable;
        }
      }
    }
  }
};

var routes = {
  index: function(req, res) {
    console.log("main route requested");
    var data = {
      status: 'OK',
      message: 'Time to get harvesting!'
    };
    res.json(data);
  },
  getData: function(req, res) {
    res.json({"data": Developers});
    // TimeTracking.daily({}, function(err, data) {
    //   var entries = data.day_entries;
    //   var projects = data.projects;
    //   var lineItems = [];
    //   entries.forEach(function(entry) {
    //     var entryInformation = {
    //       project: {
    //         id: entry.project_id,
    //         title: entry.project,
    //         client: entry.client
    //       },
    //       task: {
    //         id: entry.task_id,
    //         title: entry.task,
    //         note: entry.notes,
    //         hours: entry.hours
    //       },
    //       billable: getBillableStatus(projects, entry)
    //     };
    //     lineItems.push(entryInformation);
    //   });
    //   res.json({"data": lineItems});
    // });
  }
};

// API routes
app.get('/', routes.index);
app.get('/api/time', routes.getData);

app.use(function(req, res, next){  // if route not found, respond with 404
  var jsonData = {
    status: 'ERROR',
    message: 'Sorry, we cannot find the requested URI'
  };
  res.status(404).send(jsonData);  // set status as 404 and respond with data
});

var startExpress = function () {
  var deferred = Q.defer();
  http.createServer(app).listen(app.get('port'), function() {  // create NodeJS HTTP server using 'app'
    console.log("Express server listening on port " + app.get('port'));
    deferred.resolve();
  });
  return deferred.promise;
};

Q.fcall(getDevelopers).then(getTimeEntries).then(startExpress);
