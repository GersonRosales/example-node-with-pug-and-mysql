const express = require('express');
const router = express.Router();
const db = require('../config/db');
const mysql = require('mysql');
const _ = require('lodash');
const moment = require('moment');

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

  const textQuery = `SELECT cu.co_usuario AS id, cu.no_usuario AS name 
  FROM permissao_sistema ps
  JOIN cao_usuario cu
  ON ps.co_usuario = cu.co_usuario
  WHERE ps.co_sistema = 1
  AND ps.in_ativo = 'S'
  AND ps.co_tipo_usuario IN (0,1,2)`;

  connection.query(textQuery, (error, result, fields) => {
    if (error) {
      throw error;
    } else if (result.length > 0) {
      res.render('index', { consultant: result });
    } else {
      console.log('Registro no encontrado');
    }
  });
});

/* POST render earnings from each consultant. */
router.post('/report', (req, res, next) => {
  if (req.xhr) {
    console.log(JSON.stringify(req.body));
    const connection = mysql.createConnection(db);

    connection.connect((error) => {
      if (error) {
        throw error;
      } else {
        console.log('Successful connect');
      }
    });

    console.log(!req.body.arrayConsultants);

    if (!req.body.dateIni || !req.body.dateFin || !req.body.arrayConsultants.length) {
      res.send('<div class="alert alert-warning">Los campos del <strong>Período</strong> y <strong>Consultor</strong> son obligatorios.</div>');
    }
    /**
     * Creating a string with the format correct '2017-01-01'
     */
    const ini = `${req.body.dateIni.split('/')[1]}-${req.body.dateIni.split('/')[0]}-01`;
    const finFisrtDay = `${req.body.dateFin.split('/')[1]}-${req.body.dateFin.split('/')[0]}-01`;
    /**
     * Set the correct finale date with the las day of the month
     */
    const fin = moment(finFisrtDay).endOf('month').format('YYYY-MM-DD');
    /**
     * Transforme an array ['a', 'b', 'c'] in a list ('a', 'b', 'c')
     */
    const consultantsList = `'${req.body.arrayConsultants.join("', '")}'`;
    const textQuery = `SELECT cu.no_usuario AS user, 
    DATE_FORMAT(cf.data_emissao,'%m/%Y') AS period, 
    sum(cf.total-(cf.total*(cf.total_imp_inc/100))) AS earnings, 
    cs.brut_salario AS cost, 
    sum((cf.total-(cf.total*(cf.total_imp_inc/100)))*(cf.comissao_cn/100)) AS commission, 
    sum(cf.total-(cf.total*(cf.total_imp_inc/100))) - (cs.brut_salario + sum((cf.total-(cf.total*(cf.total_imp_inc/100)))*(cf.comissao_cn/100))) AS profit
    FROM cao_fatura cf
    JOIN cao_os co
    ON co.co_os = cf.co_os
    JOIN cao_salario cs
    ON cs.co_usuario = co.co_usuario
    JOIN cao_usuario cu
    ON co.co_usuario = cu.co_usuario
    WHERE cf.data_emissao between '${ini}' and '${fin}'
    AND co.co_usuario IN (${consultantsList})
    GROUP BY 1, 2
    ORDER BY 1`;

    connection.query(textQuery, (error, result, fields) => {
      if (error) {
        throw error;
      } else if (result.length > 0) {
        /**
         * Create a list with only the names of the consultants for then create a table to each them
         */
        const consultants = _.uniq(_.map(result, 'user'));
        res.render('report', { earnings: result, consultants: consultants });
      } else {
        res.send('<div class="alert alert-success">No se encontraron registros para el período y/o consultor(es) seleccionados.</div>');
      }
    });

    connection.end();
  }
});

module.exports = router;
