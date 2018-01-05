'use strict';

const fs       = require('fs');
const util     = require('util');
const Harvest  = require('harvest');

const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password,
  debug: true
});

const fetchEmployees = () => {
  return new Promise((resolve, reject) => {
    harvest.users.list({}, (err, res, people) => {
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
  const options = {from: params.from, to: params.to};
  if (billable) {
    options.billable = 'yes';
  }
  return new Promise((resolve, reject) => {
    harvest.reports.timeEntriesByUser(id, options, (err, res, timeEntries) => {
      // console.dir({
      //   "options has billable property": options.hasOwnProperty('billable'),
      //   "options object": JSON.stringify(options),
      //   "request.url.query property on API res object": res.request.url.query
      // });
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

  const billableData = filteredEmployees.map(employee => {
    return getHours(employee.id, params, true);
  });
  const resolvedBillableData = await Promise.all(billableData);

  const totalData = filteredEmployees.map(employee => {
    return getHours(employee.id, params);
  });
  const resolvedTotalData = await Promise.all(totalData);

  const data = filteredEmployees.map((employee, index) => {
    return {
      name: `${employee.first_name} ${employee.last_name}`,
      // billableHours: resolvedBillableData[index],
      billableHours: resolvedTotalData[index],
      totalHours: resolvedTotalData[index]
    }
  });

  // const data = filteredEmployees.map(async employee => {
  //   // const totalHoursPromise = getHours(employee.id, { from: params.from, to: params.to });
  //   // const billableHoursPromise = getHours(employee.id, { from: params.from, to: params.to, billable: 'yes' });
  //   const totalHoursPromise = getHours(employee.id, params);
  //   const billableHoursPromise = getHours(employee.id, params, true);
  //   const [totalHours, billableHours] = await Promise.all([totalHoursPromise, billableHoursPromise]);
  //   return {
  //     name: `${employee.first_name} ${employee.last_name}`,
  //     billableHours,
  //     totalHours
  //   };
  // });

  return await Promise.all(data);
};

module.exports = {
  employees: fetchEmployees,
  report: fetchEmployeesReports
};
