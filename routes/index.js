const express = require('express');
const router = express.Router();
const db = require('../config/db');
const mysql = require('mysql');
const _ = require('lodash');
const moment = require('moment');
const pug = require('pug');
const fs = require('fs');

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

    if (!req.body.dateIni || !req.body.dateFin || !req.body.arrayConsultants.length) {
      res.send('<div class="alert alert-warning">Los campos del <strong>Período</strong> y <strong>Consultor</strong> son obligatorios.</div>');
    }
    /**
     * Creating a string with the format correct '2017-01-01'
     */
    const dateIni = `${req.body.dateIni.split('/')[2]}-${req.body.dateIni.split('/')[1]}-01`;
    const finFisrtDay = `${req.body.dateFin.split('/')[2]}-${req.body.dateFin.split('/')[1]}-01`;
    /**
     * Set the correct finale date with the las day of the month
     */
    const dateFin = moment(finFisrtDay).endOf('month').format('YYYY-MM-DD');
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
    WHERE cf.data_emissao between '${dateIni}' and '${dateFin}'
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


/* POST render graphic. */
router.post('/graphic', (req, res, next) => {
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

    if (!req.body.dateIni || !req.body.dateFin || !req.body.arrayConsultants.length) {
      res.send({html: '<div class="alert alert-warning">Los campos del <strong>Período</strong> y <strong>Consultor</strong> son obligatorios.</div>', error: true});
    }
    /**
     * Creating a string with the format correct '2017-01-01'
     */
    const dateIni = `${req.body.dateIni.split('/')[2]}-${req.body.dateIni.split('/')[1]}-01`;
    const finFisrtDay = `${req.body.dateFin.split('/')[2]}-${req.body.dateFin.split('/')[1]}-01`;
    /**
     * Set the correct finale date with the las day of the month
     */
    const dateFin = moment(finFisrtDay).endOf('month').format('YYYY-MM-DD');
    const numberOfMonths = moment(dateFin).diff(moment(dateIni), 'months') + 1;

    /**
     * Transforme an array ['a', 'b', 'c'] in a list ('a', 'b', 'c')
     */
    const consultantsList = `'${req.body.arrayConsultants.join("', '")}'`;
    const textQuery = `SELECT cu.no_usuario AS name, 
    DATE_FORMAT(cf.data_emissao,'%Y/%m') AS period, 
    sum(cf.total-(cf.total*(cf.total_imp_inc/100))) AS earnings,
    cs.brut_salario AS cost
    FROM cao_fatura cf
    JOIN cao_os co
    ON co.co_os = cf.co_os
    JOIN cao_salario cs
    ON cs.co_usuario = co.co_usuario
    JOIN cao_usuario cu
    ON co.co_usuario = cu.co_usuario
    WHERE cf.data_emissao between '${dateIni}' and '${dateFin}'
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
        const consultants = _.uniq(_.map(result, 'name'));
        /**
         * Calculating the average of salario
         */
        const costAverage = _.reduce(_.map(result, 'cost'), (sum, n) => {
          return sum + n;
        }, 0);
        /**
         * Create Array with the following structure for build the charts
         * [['Month',  'Papua New Guinea', 'Rwanda', 'Average'],
            ['2004/05',   998,           450,      614.6],
            ['2005/06',   1268,          288,      682],
            ['2006/07',   807,           397,      623],
            ['2007/08',   968,           215,      609.4],
            ['2008/09',   1026,          366,      569.6]]
         */
        const array = [];
        let rowArray = _.uniq(_.map(result, 'name'));
        /*
         * Put the labels of the top
         */
        rowArray.unshift('Mes');
        rowArray.push('Costo Medio');
        array.push(rowArray);          
        /*
        * Put the labels of the rigth
        */
        for (let i = 0; i < numberOfMonths; i++) {
          rowArray = [];
          rowArray.push(moment(dateIni).add(i, 'month').format('YYYY/MM'));
          array.push(rowArray);
        }
        /*
        * Put the values of the earnings of each month by consultant
        */
        let i = 0;
        let j = 0;
        rowArray = [];
        _.forEach(result, (value, index) => {
          if (consultants[i] !== value.name) {
            if (j < numberOfMonths) {
              do {
                j++;
                array[j].push(0);
              } while (array[j][0] !== moment(dateFin).format('YYYY/MM'));
            }
            i++;
            j = 0;
          }
          do {
            j++;
            if (result.length === (index + 1)) {
              value.period = moment(dateFin).format('YYYY/MM');
              array[j].push(0);              
            } else if (array[j][0] === value.period) {
              const earnings = Math.round(value.earnings * 100) / 100;
              rowArray[j] = rowArray[j] ? rowArray[j] + earnings : earnings;
              array[j].push(earnings);
            } else {
              array[j].push(0);
            }
          } while (array[j][0] !== value.period);
        });
        /*
        * Put the values of the average
        */
        for (i = 1; i < numberOfMonths + 1; i++) {
          array[i].push(costAverage / consultants.length);
        }
        fs.readFile('./views/graphic.pug', 'utf-8', (err, data) => {
          if (err) { throw err; }
          const fn = pug.compile(data);
          const html = fn();
          res.send({html: html, earnings: array, consultants: consultants, column: consultants.length});
        });
      } else {
        res.send({html: '<div class="alert alert-success">No se encontraron registros para el período y/o consultor(es) seleccionados.</div>', error: true});
      }
    });

    connection.end();
  }
});

/* POST render pie. */
router.post('/pie', (req, res, next) => {
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

    if (!req.body.dateIni || !req.body.dateFin || !req.body.arrayConsultants.length) {
      res.send('<div class="alert alert-warning">Los campos del <strong>Período</strong> y <strong>Consultor</strong> son obligatorios.</div>');
    }
    /**
     * Creating a string with the format correct '2017-01-01'
     */
    const dateIni = `${req.body.dateIni.split('/')[2]}-${req.body.dateIni.split('/')[1]}-01`;
    const finFisrtDay = `${req.body.dateFin.split('/')[2]}-${req.body.dateFin.split('/')[1]}-01`;
    /**
     * Set the correct finale date with the las day of the month
     */
    const dateFin = moment(finFisrtDay).endOf('month').format('YYYY-MM-DD');
    const numberOfMonths = moment(dateFin).diff(moment(dateIni), 'months') + 1;
    /**
     * Transforme an array ['a', 'b', 'c'] in a list ('a', 'b', 'c')
     */
    const consultantsList = `'${req.body.arrayConsultants.join("', '")}'`;
    const textQuery = `SELECT cu.no_usuario AS name, 
    sum(cf.total-(cf.total*(cf.total_imp_inc/100))) AS earnings
    FROM cao_fatura cf
    JOIN cao_os co
    ON co.co_os = cf.co_os
    JOIN cao_salario cs
    ON cs.co_usuario = co.co_usuario
    JOIN cao_usuario cu
    ON co.co_usuario = cu.co_usuario
    WHERE cf.data_emissao between '${dateIni}' and '${dateFin}'
    AND co.co_usuario IN (${consultantsList})
    GROUP BY 1
    ORDER BY 1`;

    connection.query(textQuery, (error, result, fields) => {
      if (error) {
        throw error;
      } else if (result.length > 0) {
        /**
         * Create Array with the following structure for build the charts
         * [['Task', 'Hours per Day'],
            ['Work',     11],
            ['Eat',      2],
            ['Commute',  2],
            ['Watch TV', 2],
            ['Sleep',    7]]
         */
        const array = [];
        let arrayRow = [];
        arrayRow.push('Nombre');
        arrayRow.push('Hours per Day');
        array.push(arrayRow);
        /**
         * Sum total of earnings of everybody consultant
         */
        const sumEarnings = _.reduce(_.map(result, 'earnings'), (sum, n) => {
          return sum + n;
        }, 0);
        
        _.forEach(result, (value, index) => {
          arrayRow = [];
          arrayRow.push(value.name);
          arrayRow.push(value.earnings / sumEarnings);
          array.push(arrayRow);
        });

        fs.readFile('./views/pie.pug', 'utf-8', (err, data) => {
          if (err) { throw err; }
          const fn = pug.compile(data);
          const html = fn();
          res.send({html: html, earnings: array});
        });
      } else {
        res.send({html: '<div class="alert alert-success">No se encontraron registros para el período y/o consultor(es) seleccionados.</div>', error: true});
      }
    });

    connection.end();
  }
});

module.exports = router;
