'use strict';

const Harvest = require('harvest');

const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password
});

const fetchEmployees =  () => {
  return new Promise((resolve, reject) => {
    harvest.users.list({}, (err, res, people) => {
      try {
        const activeEmployees = people.filter(person => person.user.is_active === true).map(activePerson => activePerson.user);
        resolve(activeEmployees);
      } catch (err) {
        reject(err)
      }
    });
  })
};

const fetchReport = (id, options) => {
  return new Promise((resolve, reject) => {
    harvest.reports.timeEntriesByUser(id, options, (err, res, timeEntries) => {
      try {
        const hours = timeEntries.reduce((total, current) => total + current.day_entry.hours, 0);
        resolve(hours)
      } catch (err) {
        reject(err);
      }
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

  const totalHoursPromises = filteredEmployees.map(employee => fetchReport(employee.id, { from: params.from, to: params.to }));
  const billableHoursPromises = filteredEmployees.map(employee => fetchReport(employee.id, { from: params.from, to: params.to, billable: 'yes' }));

  const totalHours = Promise.all(totalHoursPromises);
  const billableHours = Promise.all(billableHoursPromises);
  const results = await Promise.all([billableHours, totalHours]);

  return filteredEmployees.map((employee, index) => {
    return {
      name: `${employee.first_name} ${employee.last_name}`,
      billableHours: results[0][index],
      totalHours: results[1][index]
    };
  });
};

module.exports = {
  employees: fetchEmployees,
  report: fetchEmployeesReports
};
