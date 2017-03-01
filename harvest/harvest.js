'use strict';

const Q = require('q');
const timestamp = require('time-stamp');

const Harvest = require('harvest');
const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password
});
const people = harvest.People;
const timeTracking = harvest.TimeTracking;

let Employees;
let TimeEntries;
let DailyTotals;

const fetchEmployees = function () {
  return Q.Promise(function (resolve, reject, notify) {
    harvest.People.list({}, function (err, people) {
      if (err) {
        reject(new Error(err));
      } else {
        Employees = people.filter(function (person) {
          return person.user.is_active === true;
        }).map(function (activePerson) {
          return activePerson.user;
        });
        resolve(Employees);
      }
    });
  });
};

const retrieveEmployees = function (filters) {
  if (filters === undefined) {
    return Employees;
  } else {
    return Employees.filter(function (employee) {
      return Object.keys(filters).every(function (key) {
        return employee.user[key] === filters[key];
      });
    });
  }
};

const fetchUserTimeEntries = function (userId, date) {
  return Q.Promise(function (resolve, reject, notify) {
    let options = (date === undefined) ? { of_user: userId } : { of_user: userId, date: date };
    harvest.TimeTracking.daily(options, function (err, data) {
      if (err) {console.log(err);
        reject(new Error(err));
      } else {
        data.user = userId;
        resolve(data);
      }
    });
  })
};

const fetchGroupTimeEntries = function (group) {
  let promises = [];
  group.forEach(function (member) {
    promises.push(fetchUserTimeEntries(member.id));
  });
  return Q.all(promises);
};

const storeTimeEntries = function (timeEntries) {
  TimeEntries = timeEntries;
  return timeEntries;
};

const calculateTotals = function (fetchedTimeEntries) {
  let timeEntries = (fetchedTimeEntries === undefined) ? TimeEntries.slice(0) : fetchedTimeEntries;
  let employees = Employees.slice(0);
  let employeesMap = employees.map(function (employee) {
    return employee.id;
  });

  let dailyTotals = timeEntries.map(function (employeeTimeEntries) {
    let employee = employees[employeesMap.indexOf(employeeTimeEntries.user)];
    let dayEntries = employeeTimeEntries.day_entries;
    let projects = employeeTimeEntries.projects;
    let projectsMap = employeeTimeEntries.projects.map(function (project) {
      return project.id;
    });

    let employeeTotals = {
      id: employee.id,
      name: {
        first: employee.first_name,
        last: employee.last_name
      },
      hours: {
        billable: 0,
        total: 0
      },
      active: {
        isActive: false,
        isBillable: false,
      }
    };

    dayEntries.forEach(function (entry, index) {
      let isBillable = false;
      let isActive = Object.prototype.hasOwnProperty.call(entry, 'timer_started_at');
      let project = projects[projectsMap.indexOf(parseInt(entry.project_id))];
      if (project) {
        let task = project.tasks.find(function (task) {
          return task.id === parseInt(entry.task_id);
        });
        if (task && task.billable) {
          isBillable = true;
        }
      }
      employeeTotals.hours.total += entry.hours;
      if (isBillable) {
        employeeTotals.hours.billable += entry.hours;
        if (isActive) {
          employeeTotals.active.isActive = true;
        }
      }
      if (isActive) {
        employeeTotals.active.isActive = true;
      }
    });
    return employeeTotals;
  });
  DailyTotals = dailyTotals;
  return dailyTotals;
};

const pollForEntries = function () {
  fetchEmployees()
  .then(fetchGroupTimeEntries)
  .then(storeTimeEntries)
  .then(calculateTotals)
  .done(function (totals) {
    console.log(totals);
  });
};

module.exports = {
  People: people,
  TimeTracking: timeTracking,
  fetchEmployees: fetchEmployees,
  retrieveEmployees: retrieveEmployees,
  fetchUserTimeEntries: fetchUserTimeEntries,
  pollForEntries: pollForEntries
};
