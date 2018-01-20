const express = require('express');
const router = express.Router();
const db = require('../config/db');
const mysql = require('mysql');

/* GET home page. */
router.get('/', (req, res, next) => {
  const connection = mysql.createConnection(db);
  let consultant;

  connection.connect((error) => {
    if (error) {
      throw error;
    } else {
      console.log('Connection Successful.');
    }
  });
  connection.end();
  res.render('index', { title: 'Express' });
});

module.exports = router;
