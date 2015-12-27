var url = require('url');
var v8 = require('v8');
var onFinished = require('on-finished');
var _ = require('underscore');
var Prometheus = require('prometheus-client')
var prometheus = new Prometheus();

var namespace = 'nodejs';
var metrics = {
  process_uptime: prometheus.newGauge({
    namespace: namespace,
    name: 'process_uptime',
    help: 'The uptime of the node process in seconds'
  }),
  /** Chrome V8 metrics **/
  v8_total_heap_size_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_total_heap_size_bytes',
    help: 'V8 total heap size in bytes'
  }),
  v8_total_executable_heap_size_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_total_executable_heap_size_bytes',
    help: 'V8 total heap size of executable code in bytes'
  }),
  v8_total_physical_size_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_total_physical_size_bytes',
    help: 'V8 total physical size in bytes'
  }),
  v8_total_available_size_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_total_available_size_bytes',
    help: 'V8 total available size in bytes'
  }),
  v8_used_heap_size_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_used_heap_size_bytes',
    help: 'V8 used heap size in bytes'
  }),
  v8_heap_size_limit_bytes: prometheus.newGauge({
    namespace: namespace,
    name: 'v8_heap_size_limit_bytes',
    help: 'V8 heap size limit in bytes'
  }),
  /** Nodejs HTTP metrics **/
  http_request_count: prometheus.newCounter({
    namespace: namespace,
    name: 'http_request_count',
    help: 'The number of HTTP requests received'
  }),
  http_request_active: prometheus.newCounter({
    namespace: namespace,
    name: 'http_request_active',
    help: 'The number of HTTP requests currently being handled'
  }),
  http_request_duration: prometheus.newGauge({
    namespace: namespace,
    name: 'http_request_duration',
    help: 'The duration of each request in milliseconds'
  }),
  /** Nodejs Net metrics **/
  net_connection_active_total: prometheus.newCounter({
    namespace: namespace,
    name: 'net_connection_active_total',
    help: 'The number of currently open TCP connections'
  }),
  net_connection_timeout_total: prometheus.newCounter({
    namespace: namespace,
    name: 'net_connection_timeout_total',
    help: 'The number of TCP connections that have timed out'
  }),
  net_connection_error_total: prometheus.newCounter({
    namespace: namespace,
    name: 'net_connection_error_total',
    help: 'The number of TCP connections that have errored'
  })
};

function makeRequestLabels(req) {
  return {
    method: req.method,
    path: url.parse(req.url).path
  }
}
var nodeMetricsTimer;

module.exports = function(appName, appID) {
  var defaultLabels = {
    app_name: appName,
    app_id: appID
  };

  if (!nodeMetricsTimer) {
    nodeMetricsTimer = setInterval(function() {
      var heapStats = v8.getHeapStatistics();
      metrics.process_uptime.set(defaultLabels, process.uptime());
      metrics.v8_total_heap_size_bytes.set(defaultLabels, heapStats.total_heap_size);
      metrics.v8_total_executable_heap_size_bytes.set(defaultLabels, heapStats.total_heap_size_executable);
      metrics.v8_total_physical_size_bytes.set(defaultLabels, heapStats.total_physical_size);
      metrics.v8_total_available_size_bytes.set(defaultLabels, heapStats.total_available_size);
      metrics.v8_used_heap_size_bytes.set(defaultLabels, heapStats.used_heap_size);
      metrics.v8_heap_size_limit_bytes.set(defaultLabels, heapStats.heap_size_limit);
    }, 5000);
    // Make sure the time doesn't block the process from stopping.
    nodeMetricsTimer.unref();
  }

  return {
    metricsEndpoint: function() {
      return prometheus.metricsFunc();
    },
    measureRequests: function(options) {
      return function requestCounter(req, res, next) {
        var duration = process.hrtime();
        var labels = makeRequestLabels(req);
        _.extend(labels, defaultLabels);
        metrics.http_request_active.increment(labels);

        onFinished(res, function(err, res) {
          duration = process.hrtime(duration);
          metrics.http_request_active.decrement(labels);
          metrics.http_request_duration.set(labels, duration[0]/1000 + duration[1]/1000000);

          labels.status = res.statusCode;
          metrics.http_request_count.increment(labels);
        });

        next();
      }
    },
    measureServer: function(server, port) {
      server.on('connection', function(socket) {
        var labels = _.extend({
          port: port
        }, defaultLabels);
        metrics.net_connection_active_total.increment(labels);
        socket.on('close', function(err) { metrics.net_connection_active_total.decrement(labels); });
        socket.on('timeout', function(err) { metrics.net_connection_timeout_total.increment(labels); });
        socket.on('error', function(err) { metrics.net_connection_error_total.increment(labels); });
      });
    }
  }
};
