'use strict';

const Harvest = require('harvest');
const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password
});

const fetchEmployees =  () => {
  return new Promise((resolve, reject) => {
    harvest.People.list({}, (err, people) => {
      if (err) reject(new Error(err));
      const activeEmployees = people.filter(person => {
        return person.user.is_active === true;
      }).map(activePerson => {
        return activePerson.user;
      });
      resolve(activeEmployees);
    });
  })
};

const fetchReport = (options) => {
  return new Promise((resolve, reject) => {
    harvest.Reports.timeEntriesByUser(options, (err, data) => {
      if (err) reject(new Error(err));
      let hours = 0;
      if (data) {
        hours = data.reduce((total, current) => total + current.day_entry.hours, 0);
      }
      resolve(hours);
    });
  });
}

const filterEmployees = (employees, department) => {
  if (department) {
    return employees.filter(employee => {
      return employee.roles.map(role => role.toLowerCase()).includes(department.toLowerCase());
    });
  }
  return employees;
};

const fetchEmployeesReports = async params => {
  const employees = await fetchEmployees();
  const filteredEmployees = filterEmployees(employees, params.department);
  const promises = filteredEmployees.map(async employee => {
    const totalHours = fetchReport({ from: params.from, to: params.to, user_id: employee.id });
    const billableHours = fetchReport({ from: params.from, to: params.to, user_id: employee.id, billable: true });
    const results = await Promise.all([billableHours, totalHours]);
    return {
      name: `${employee.first_name} ${employee.last_name}`,
      billableHours: results[0],
      totalHours: results[1]
    };
  });
  return Promise.all(promises);
};

module.exports = {
  employees: fetchEmployees,
  report: fetchEmployeesReports
};
