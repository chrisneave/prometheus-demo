var express = require('express');
var morgan = require('morgan');
var onFinished = require('on-finished');
var Prometheus = require('prometheus-client');
var metrics = new Prometheus();
var metricsApp = express();
var app = express();

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

function createRequestCounter(endpointName) {
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
metricsApp.use(createRequestCounter('nodeapp_metrics'));
metricsApp.get('/metrics', metrics.metricsFunc());

metricsApp.listen(9090, function() {
  console.log('Metrics API listening on port 9090');
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

app.listen(3000, function() {
  console.log('nodeapp listening on port 3000');
});
