var url = require('url');
var ip = require('ip');
var express = require('express');
var morgan = require('morgan');
var uuid = require('node-uuid');
var bunyan = require('bunyan');
var log = bunyan.createLogger({ name: 'nodeapp' });
var nodeMetrics = require('./nodeMetrics');
var registerWithConsul = require('./register.js');
var metricsApp = express();
var app = express();
var appID = uuid.v4();

metrics = nodeMetrics('nodeapp', appID);

metricsApp.use(morgan('dev'));
metricsApp.get('/', function(req, res, next) {
  res.status(200).send('Hello, World!').end();
  next();
});
metricsApp.get('/metrics', metrics.metricsEndpoint());

registerWithConsul({
  app: 'nodeapp_metrics',
  appID: appID,
  port: 9090,
  tags: ['metrics'],
  address: ip.address(),
  check: {
    http: url.format({ protocol: 'http', hostname: ip.address(), port: 9090 }),
    interval: '5s',
    timeout: '1s'
  }
}, function(result) {
  log.info('Registered with Consul => ' + result);

  metricsApp.listen(9090, function() {
    log.info('Metrics API listening on port 9090');
  });
});

app.use(morgan('dev'));
app.use(metrics.measureRequests());
app.get('/', function(req, res, next) {
  res.status(200).send('Hello, World!').end();
  next();
});
app.get('/slow', function(req, res, next) {
  setTimeout(function() {
    res.status(200).send('Phew! Took a while...').end();
    next();
  }, Math.random() * 1000);
});

registerWithConsul({
  app: 'nodeapp',
  appID: appID,
  port: 3000,
  tags: ['app'],
  address: ip.address(),
  check: {
    http: url.format({ protocol: 'http', hostname: ip.address(), port: 3000 }),
    interval: '5s',
    timeout: '1s'
  }
}, function(result) {
  log.info('Registered with Consul => ' + result);

  var server = app.listen(3000, function() {
    log.info('nodeapp listening on port 3000');
  });

  metrics.measureServer(server, 3000);
});
