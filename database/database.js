'use strict';

const Q = require('q');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let database;

const connectToDatabase = function () {
  return Q.Promise(function (resolve, reject, notify) {
    MongoClient.connect(process.env.MONGODB_URI, function (err, db) {
      if (err) {
        reject(new Error(err));
      } else {
        console.log('Database connection ready');
        database = db;
        resolve(db);
      }
    });
  });
};

const queryDatabase = function (params) {
  let query = params.query;
  let dbCollection = database.collection(params.collection);
  return Q.Promise(function (resolve, reject, notify) {
    dbCollection.find(query).toArray(function(err, item) {
      if (err) {
        reject(new Error(err));
      }
      resolve(item);
    });
  })
};

const writeToDatabase = function (params) {
  let document = params.document;
  let dbCollection = database.collection(params.collection);
  return Q.Promise(function (resolve, reject, notify) {
    dbCollection.update({ date: document.date }, document, { upsert: true }, function(err, item) {
      if (err) {
        reject(new Error(err));
      }
      resolve(item);
    });
  });

};

module.exports = {
  start: connectToDatabase,
  query: queryDatabase,
  write: writeToDatabase
};

