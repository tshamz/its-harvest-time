const Harvest = require('harvest');
const harvest = new Harvest({
  subdomain: process.env.subdomain,
  email: process.env.email,
  password: process.env.password
});
const people = harvest.People;
const timeTracking = harvest.TimeTracking;

module.exports = {
  People: people,
  TimeTracking: timeTracking
};
