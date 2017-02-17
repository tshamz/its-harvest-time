var Q                 = require('q');
var http              = require('http');
var path              = require('path');
var moment            = require('moment');
var express           = require('express');
var Harvest           = require('harvest');
var json2csv          = require('json2csv');
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
var Developers = {};
var CalculatedTimes = [];

var calculatePeoplesTime = function () {
  var deferred = Q.defer();

  CalculatedTimes = [];
  for (var key in Developers) {
    var Developer = Developers[key];

    var totalTime = 0;
    var billableTime = 0;
    Developer.entries.forEach(function (entry) {
      totalTime += entry.hours;
      if (entry.is_billable) {
        billableTime += entry.hours;
      }
      if (entry.hasOwnProperty('timer_started_at')) {
        Developer.active.is_active = true;
        if (entry.is_billable) {
          Developer.active.is_billable = true;
        }
      }
    });
    CalculatedTimes.push({
      name: Developer.name.name,
      hours: {
        totalTime: totalTime,
        billableTime: billableTime
      },
      active: Developer.active
    });
  }
  return deferred.resolve();
};

var getTimeEntry = function (developer, day) {
  var deferred = Q.defer();
  var today = new Date();
  TimeTracking.daily({date: day, of_user: developer.user.id}, function (err, data) {

    if (err) {
      console.log('err');
      deferred.reject(new Error(error));
    } else {
      var Developer = Developers[developer.user.id];
      var projects = data.projects;
      var projectsMap = projects.map(function (project) {
        return project.id;
      });

      data.day_entries.forEach(function (entry, index) {
        var projectId = parseInt(entry.project_id, 10);
        var projectIndex = projectsMap.indexOf(projectId);
        var project = projects[projectIndex];
        var taskId = parseInt(entry.task_id, 10);

        if (projectIndex !== -1) {
          project.tasks.forEach(function (task) {
            if (task.id === taskId) {
              data.day_entries[index].is_billable = task.billable;
            }
          });
        } else {
          data.day_entries[index].is_billable = false;
          console.log(`Archieved Project: ${Developer.name.name} - ${entry.project}`);
        }
      });

      Developer.entries = Developer.entries.concat(data.day_entries);
      deferred.resolve();
    }
  });
  return deferred.promise;
};

var getTimeEntries = function(developers) {
  var promises = [];
  var days = [];
  var today = new Date;
  for (var i = 0; i < today.getDay(); i++) {
    days.push(new Date(today.getFullYear(), today.getMonth(), (today.getDate() - i), 12, 0, 0));
  };
  developers.forEach(function (developer) {
    days.forEach(function (day) {
      promises.push(getTimeEntry(developer, day));
    });
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
      });

      Developers = {};
      developers.forEach(function (developer) {
        Developers[developer.user.id] = {
          name: {
            first: developer.user.first_name.toLowerCase(),
            last: developer.user.last_name.toLowerCase(),
            name: developer.user.first_name.toLowerCase() + ' ' + developer.user.last_name.toLowerCase()
          },
          entries: [],
          active: {
            is_active: false,
            is_billable: false
          }
        };
      });
      deferred.resolve(developers);
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

/**
 * ROUTES
 */

var routes = {
  index: function(req, res) {
    console.log("main route requested");
    var data = {
      status: 'OK',
      message: 'Time to get harvesting!'
    };
    res.json(data);
  },
  getTime: function(req, res) {
    res.json({"data": CalculatedTimes});
  },
  getCSV: function(req, res) {
    var data = json2csv({data: CalculatedTimes, fields: ['name', 'hours.totalTime', 'hours.billableTime'], fieldNames: ['Name', 'Total Time', 'Billable Time']});
    res.attachment('exported-harvest-times.csv');
    res.status(200).send(data);
  }
};

// API routes
app.get('/', routes.index);
app.get('/api/time', routes.getTime);
app.get('/api/csv', routes.getCSV);

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

Q.fcall(getDevelopers).then(getTimeEntries).then(calculatePeoplesTime).then(startExpress).done();

setInterval(function () {
  Q.fcall(getDevelopers).then(getTimeEntries).then(calculatePeoplesTime).done();
}, 1000*60);
