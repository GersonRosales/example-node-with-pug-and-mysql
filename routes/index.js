const express = require('express');
const router = express.Router();
const db = require('../config/db');
const mysql = require('mysql');
const _ = require('lodash');

/* GET home page. */
router.get('/', (req, res, next) => {
  const connection = mysql.createConnection(db);

  connection.connect((error) => {
    if (error) {
      throw error;
    } else {
      console.log('Connection Successful.');
    }
  });

  const textQuery = `SELECT * FROM permissao_sistema ps
  JOIN cao_usuario cu
  ON ps.co_usuario = cu.co_usuario
  WHERE ps.co_sistema = 1
  AND ps.in_ativo = 'S'
  AND ps.co_tipo_usuario IN (0,1,2)`;

  connection.query(textQuery, (error, result, fields) => {
    if (error) {
      throw error;
    } else {
      const consultant = _.map(result, 'no_usuario');
      if (consultant.length > 0) {
        res.render('index', { consultant: consultant });
      } else {
        console.log('Registro no encontrado');
      }
    }
  });
});

module.exports = router;
