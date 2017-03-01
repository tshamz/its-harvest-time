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
  let date = params.date;
  let collection = params.collection;
  if (date === undefined || collection === undefined) {
    throw new Error('writeToDatabase(params) requires both a params.date and params.collection property');
  }
  let dbCollection = database.collection(collection);
  return Q.Promise(function (resolve, reject, notify) {
    dbCollection.findOne({ date: date }, function(err, item) {
      if (err) {
        console.log(err);
        reject(new Error(err));
      }
      resolve(item);
    });
  })
};

const writeToDatabase = function (params) {
  let document = params.document;
  let collection = params.collection;
  if (document === undefined || collection === undefined) {
    throw new Error('writeToDatabase(params) requires both a params.document and params.collection property');
  }
  let dbCollection = database.collection(collection);
  dbCollection.update({ date: document.date }, document, { upsert: true });
};

module.exports = {
  start: connectToDatabase,
  query: queryDatabase,
  write: writeToDatabase
};
