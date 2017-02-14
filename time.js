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
var Developers = {};

var calculatePeoplesTime = function () {
  var deferred = Q.defer();
  var calculatedTimes = []
  for (var key in Developers) {
    var developer = Developers[key];

    var totalTime = 0;
    var billableTime = 0;
    developer.entries.forEach(function (entry) {
      totalTime += entry.hours;
      if (entry.is_billable) {
        billableTime += entry.hours;
      }
    });
    calculatedTimes.push({
      name: developer.name.name,
      hours: {
        totalTime: totalTime,
        billableTime: billableTime
      },
      active: person.active
    });
  }
  deferred.resolve();
  return deferred.promise;
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

        project.tasks.forEach(function (task) {
          if (task.id === taskId) {
            data.day_entries[index].is_billable = task.billable;
          }
        });
      });

      Developer.entries = Developer.entries.concat(data.day_entries);

      if (day.getDay() === today.getDay()) {
        Developer.entries.forEach(function (entry) {
          if (entry.hasOwnProperty('timer_started_at')) {
            developer.active.is_active = true;
            if (entry.is_billable) {
              developer.active.is_billable = true;
            }
          }
        });
      }
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

      // console.dir(developers);

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

Q.fcall(getDevelopers).then(getTimeEntries).then(calculatePeoplesTime).then(startExpress).done();

setInterval(function () {
  Q.fcall(getDevelopers).then(getTimeEntries).then(calculatePeoplesTime).done();
}, 1000*60);
