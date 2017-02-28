'use strict';

/**
 * Harvest Integration
 */

const harvest = require('./harvest/harvest.js');

/**
 * ExpressJS App
 */

const express = require('./app/app.js');
const startExpress = function () {
  let deferred = Q.defer();
  express.start(deferred);
  return deferred.promise;
};

/**
 * MongoDB
 */

const mongo = require('./database/database.js');
const startMongo = function () {
  let deferred = Q.defer();
  mongo.start(deferred);
  return deferred.promise;
};

/**
 * Other Stuff
 */

const Q = require('q');
const moment = require('moment');
const json2csv = require('json2csv');

let Developers = {};
let CalculatedTimes = [];

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
      name: {
        first: Developer.name.first.charAt(0).toUpperCase() + Developer.name.first.slice(1),
        last: Developer.name.last.charAt(0).toUpperCase() + Developer.name.last.slice(1)
      },
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
  harvest.TimeTracking.daily({date: day, of_user: developer.user.id}, function (err, data) {
    if (err) {
      console.log(err);
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
  harvest.People.list({}, function (err, people) {
    if (err) {
      console.log(err);
      deferred.reject(new Error(err));
    } else {
      Developers = {};
      var developers = people.filter(function (data) {
        var isDeveloper = false;
        var department = data.user.department;
        if (department && department !== null) {
          isDeveloper = data.user.department.toLowerCase().indexOf('development') !== -1;
        }
        return isDeveloper && data.user.is_active;
      });
      developers.forEach(function (developer) {
        var fullName = developer.user.first_name.toLowerCase() + ' ' + developer.user.last_name.toLowerCase();
        Developers[developer.user.id] = {
          name: {
            first: developer.user.first_name.toLowerCase(),
            last: developer.user.last_name.toLowerCase(),
            name: fullName
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

var buildCSV = function () {
  var fields = ['names.first', 'hours.totalTime', 'hours.billableTime'];
  var fieldNames = ['Name', 'Total Time', 'Billable Time'];
  var sortedData = CalculatedTimes.sort(function (a, b) {
    var nameA = a.names.first.toUpperCase();
    var nameB = b.names.first.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
  return json2csv({data: sortedData, fields: fields, fieldNames: fieldNames});
};

/**
 * Init
 */

// Q.fcall(getDevelopers)
Q.fcall(startMongo)
 .then(startExpress)
 .then(getDevelopers)
 .then(getTimeEntries)
 .then(calculatePeoplesTime)
 .done();

 /**
  * Timer
  */

setInterval(function () {
  Q.fcall(getDevelopers)
   .then(getTimeEntries)
   .then(calculatePeoplesTime)
   .done();
}, 1000 * 60);  // 60 seconds
