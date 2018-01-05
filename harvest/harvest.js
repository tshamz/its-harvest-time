'use strict';

const fs      = require('fs');
const util    = require('util');
const Harvest = require('harvest');

const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password,
  debug: false
});

const fetchEmployees = () => {
  return new Promise((resolve, reject) => {
    harvest.People.list({}, (err, people) => {
      try {
        const activeEmployees = people
          .filter(person => person.user.is_active === true)
          .map(activePerson => activePerson.user);
        resolve(activeEmployees);
      } catch (err) {
        reject(err);
      }
    });
  });
};

const getHours = (id, params, billable) => {
  const {department, ...rest} = params;
  const options = (billable) ? { ...rest, user_id: id, billable: 'yes' } : { ...rest, user_id: id };
  return new Promise((resolve, reject) => {
    harvest.Reports.timeEntriesByUser(options, (err, timeEntries) => {
      try {
        const hours = timeEntries.reduce((total, current) => total + current.day_entry.hours, 0);
        resolve(hours);
      } catch (error) {
        resolve(0);
      }
    });
  });
};

const filterEmployees = (employees, department) => {
  if (department) {
    return employees.filter(employee => {
      return employee.roles
        .map(role => role.toLowerCase())
        .includes(department.toLowerCase());
    });
  }
  return employees;
};

const fetchEmployeesReports = async params => {
  const employees = await fetchEmployees();
  const filteredEmployees = filterEmployees(employees, params.department);
  const data = filteredEmployees.map(async employee => {
    const totalHoursPromise = getHours(employee.id, params);
    const billableHoursPromise = getHours(employee.id, params, true);
    const [totalHours, billableHours] = await Promise.all([totalHoursPromise, billableHoursPromise]);
    return {
      name: `${employee.first_name} ${employee.last_name}`,
      billableHours,
      totalHours
    };
  });
  return await Promise.all(data);
};

module.exports = {
  employees: fetchEmployees,
  report: fetchEmployeesReports
};
