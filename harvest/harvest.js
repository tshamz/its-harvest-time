'use strict';

const Q = require('q');
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
        resolve({employees: Employees});
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
        return employee[key] === filters[key];
      });
    });
  }
};

const fetchEmployeeTimeEntries = function (params) {
  let userId = params.userId;
  let date = params.date;
  if (userId == undefined) {
    throw new Error('fetchEmployeeTimeEntries(params) requires a params.userId property');
  }
  return Q.Promise(function (resolve, reject, notify) {
    let options = (date === undefined) ? { of_user: userId } : { of_user: userId, date: date };
    harvest.TimeTracking.daily(options, function (err, data) {
      if (err) {
        reject(new Error(err));
      } else {
        data.user = userId;
        resolve(data);
      }
    });
  })
};

const fetchEmployeesTimeEntries = function (params) {
  let employees = params.employees;
  let date = params.date;
  if (employees == undefined) {
    throw new Error('fetchEmployeesTimeEntries(params) requires a params.employee property');
  }
  let promises = [];
  employees.forEach(function (employee) {
    promises.push(fetchEmployeeTimeEntries({ userId: employee.id, date: date }));
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

  let totals = timeEntries.map(function (employeeTimeEntries) {
    let employee = employees[employeesMap.indexOf(employeeTimeEntries.user)];
    let dayEntries = employeeTimeEntries.day_entries;
    let projects = employeeTimeEntries.projects;
    let projectsMap = employeeTimeEntries.projects.map(function (project) {
      return project.id;
    });

    let employeeTotals = {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department,
      isActive: false,
      isBillable: false,
      hours: {
        billable: 0,
        total: 0
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
      if (isActive) {
        employeeTotals.isActive = true;
      }
      if (isActive && isBillable) {
        employeeTotals.isBillabe = true;
      }
      if (isBillable) {
        employeeTotals.hours.billable += entry.hours;
      }
      employeeTotals.hours.total += entry.hours;
    });
    return employeeTotals;
  });
  let dailyTotals = {
    date: fetchedTimeEntries[0].for_day,
    entries: totals
  }
  DailyTotals = dailyTotals;
  return dailyTotals;
};

const pollForEntries = function () {
  return fetchEmployees()
  .then(fetchEmployeesTimeEntries)
  .then(storeTimeEntries)
  .then(calculateTotals);
};

const getEntriesForDay = function (date) {
  return fetchEmployees()
  .then(function(params) {
    return {
      date: date,
      employees: params.employees
    };
  })
  .then(fetchEmployeesTimeEntries)
  .then(calculateTotals);
}

const getCurrentTimes = function () {
  return DailyTotals;
};

module.exports = {
  poll: pollForEntries,
  getEntries: getEntriesForDay,
  time: getCurrentTimes
};
