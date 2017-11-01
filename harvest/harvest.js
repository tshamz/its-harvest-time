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
        // resolve({employees: Employees});
        resolve(Employees);
      }
    });
  });
};

const retrieveEmployees = function (filters) {
  return fetchEmployees().then(function (employees) {
    console.log(employees)
    if (filters.department === 'All') {
      return Employees;
    } else {
      return Employees.filter(function (employee) {
        return Object.keys(filters).every(function (key) {
          return employee[key] === filters[key];
        });
      });
    }
  })
};

const fetchReport = function (params, userId, isBillable) {
  let options = {
    from: params.from,
    to: params.to,
    user_id: userId
  };
  if (isBillable) {
    options.billable = true
  };
  return Q.Promise(function (resolve, reject, notify) {
    harvest.Reports.timeEntriesByUser(options, function (err, data) {
      if (err) reject(new Error(err));
      let hours;
      if (Object.keys(data).length !== 0) {
        hours = data.reduce(function (total, current) {
          return total + current.day_entry.hours;
        }, 0);
      } else {
        hours = 0;
      }
      resolve(hours);
    });
  });
};

const fetchReports = function (params, employee) {
  let name = `${employee.first_name} ${employee.last_name}`;
  return Q.spread([
    fetchReport(params, employee.id, true),
    fetchReport(params, employee.id)],
  function (billableHours, totalHours) {
    return {
      name: name,
      billableHours: billableHours,
      totalHours: totalHours
    }
  });
};

const fetchEmployeesReports = function (params) {
  let promises = [];
  const filters = (params.department == undefined) ? {department: 'All'} : {department: params.department};

  fetchEmployees().then(employees => console.log(employees));

  // retrieveEmployees(filters).then(function (employees) {
  //   console.log('1')
  //   console.log(employees)
  //   employees.forEach(function (employee) {
  //     promises.push(fetchReports(params, employee))
  //   });
  // })

  // return Q.all(promises);
};

module.exports = {
  employees: fetchEmployees,
  report: fetchEmployeesReports
};
