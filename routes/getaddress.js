var express = require('express');
var https = require('https');
var querystring = require('querystring');
var batch = require('batchflow');
var router = express.Router();

//mysql 연동 설정
var http = require('http');
var path = require('path');
var mysql = require('mysql');
var connection = mysql.createConnection({
  host    :'localhost',
  port : 3306,
  user : 'root',
  password : '1234',
  database:'landmark'
});

connection.connect(function(err) {
  if (err) {
    console.error('mysql connection error');
    console.error(err);
    throw err;
  }
});

/* GET all data */
router.get('/detail', function(req, res, next) {
  var query = connection.query('select * from real_dealing_raw_data where road_name = ' + mysql.escape('선릉로') ,function(err,rows){
    if (err) {
      console.error(err);
      throw err;
    }
    console.log(rows);
    res.json(rows);
  });
  console.log(query);
});

// mysql select
router.get('/',function(req,res,next){
  var query = connection.query('select * from real_dealing_raw_data where where address='+mysql.escape(req.query.address),function(err,rows){
    if (err) {
      console.error(err);
      throw err;
    }
    console.log(query);
    res.json(rows);
  });
});

/* 주소정보를 lat, lng 정보로 변환*/
router.get('/convert/address', function(req, res, next) {
  var query = connection.query('select * from real_dealing_raw_data where lat is null and lng is null' ,function(err,rows){
    if (err) {
      console.error(err);
      throw err;
    }



    var https_count = 1;
    batch(rows).sequential()
        .each(function(key, val, next) {
          var id = val.real_dealing_raw_data_id;
          var fullAddress = val.address + ' ' + val.address_detail;

          var params = {
            apikey: '7609a158f26dcdd1dad065d84110ef8d',
            q: fullAddress,
            output : 'json'
          };

          //3초 sleep
          ts1 = new Date().getTime() + 1500;
          do ts2 = new Date().getTime(); while (ts2<ts1);

          console.log('full = ' + fullAddress);

          var jsonObj;
          https.get('https://apis.daum.net/local/geo/addr2coord' + '?' + querystring.stringify(params), function(res) {
            var buffer = '';
            res.on('data', function(data) {
              buffer += data;
              console.log('data =' + buffer);
            });
            res.on('error', function(err) {
              console.log(err)
            });
            res.on('end', function() {
              jsonObj = JSON.parse(buffer);

              if(jsonObj.channel.item == undefined) {
                console.error('error find..');
                next();
              }
              var lat = jsonObj.channel.item[0].lat;
              var lng = jsonObj.channel.item[0].lng;
              console.log('[' + (https_count++) + '/ ' + rows.length + ']');

              next(connection.query('UPDATE real_dealing_raw_data SET lng = ? , lat = ? WHERE real_dealing_raw_data_id = ?', [lng, lat, id]));
            });
          });
          //console.log((this.finished / this.total) * 100.0); //{percent complete}
        }).end(function(results) {
          res.json("success");
    });
  });
});


// mysql select
router.get('/coord/range',function(req,res,next){
  var reqLatStart = req.query.latS;
  var reqLatEnd = req.query.latE;
  var reqLngStart = req.query.lngS;
  var reqLngEnd = req.query.lngE;
  var query = connection.query('select lat,lng,address_detail_name as detail_name from real_dealing_raw_data where lat between ' + reqLatStart + ' and ' + reqLatEnd + ' and lng between ' + reqLngStart + ' and ' + reqLngEnd + ' group by lat, lng', function(err,rows){
    if (err) {
      console.error(err);
      throw err;
    }
    
    res.json({'positions' : rows});
    console.log('resultSize =' + rows.length);
  });
});


module.exports = router;
