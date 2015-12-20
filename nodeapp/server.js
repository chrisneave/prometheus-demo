var url = require('url');
var ip = require('ip');
var express = require('express');
var morgan = require('morgan');
var onFinished = require('on-finished');
var Prometheus = require('prometheus-client');
var metrics = new Prometheus();
var nodeMetrics = require('./nodeMetrics');
var bunyan = require('bunyan');
var log = bunyan.createLogger({ name: 'nodeapp' });
var registerWithConsul = require('./register.js');
var metricsApp = express();
var app = express();

nodeMetrics('nodeapp');

function createRequestCounter(endpointName) {
  var requests = metrics.newCounter({
    namespace: 'nodeapp',
    name: 'http_request_count',
    help: 'The number of HTTP requests received'
  });

  var activeRequests = metrics.newCounter({
    namespace: 'nodeapp',
    name: 'http_request_active',
    help: 'The number of HTTP requests currently being handled'
  });

  var requestDuration = metrics.newGauge({
    namespace: 'nodeapp',
    name: 'http_request_duration',
    help: 'The duration of each request in milliseconds'
  });

  return function requestCounter(req, res, next) {
    var duration = process.hrtime();
    requests.increment({ endpoint: endpointName });
    activeRequests.increment();

    onFinished(res, function(err, res) {
      duration = process.hrtime(duration);
      activeRequests.decrement();
      requestDuration.set({ endpoint: endpointName, }, duration[0]/1000 + duration[1]/1000000);
    });
    next();
  }
}

metricsApp.use(morgan('dev'));
metricsApp.get('/', function(req, res, next) {
  res.status(200).send('Hello, World!').end();
  next();
});
metricsApp.get('/metrics', metrics.metricsFunc());

registerWithConsul({
  app: 'nodeapp_metrics',
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
app.use(createRequestCounter('nodeapp'));
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
});
