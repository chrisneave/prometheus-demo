var v8 = require('v8');
var Prometheus = require('prometheus-client');
var metrics = new Prometheus();

function createCollector(appName) {
  var upTime = metrics.newGauge({
    namespace: appName,
    name: 'node_process_uptime',
    help: 'The uptime of the node process in seconds'
  });
  var v8TotalHeapSize = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_total_heap_size_bytes',
    help: 'V8 total heap size in bytes'
  });
  var v8TotalHeapSizeExecutable = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_total_heap_size_executable_bytes',
    help: 'V8 total heap size of the executable code in bytes'
  });
  var v8TotalPhysicalSize = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_total_physical_size_bytes',
    help: 'V8 total physical size in bytes'
  });
  var v8TotalAvailableSize = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_total_available_size_bytes',
    help: 'V8 total available size in bytes'
  });
  var v8UsedHeapSize = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_used_heap_size_bytes',
    help: 'V8 used heap size in bytes'
  });
  var v8HeapSizeLimit = metrics.newGauge({
    namespace: appName,
    name: 'node_v8_heap_size_limit_bytes',
    help: 'V8 heap size limit in bytes'
  });

  return function() {
    var heapStats = v8.getHeapStatistics();
    upTime.set({ endpoint: appName }, process.uptime());
    v8TotalHeapSize.set({ endpoint: appName }, heapStats.total_heap_size);
    v8TotalHeapSizeExecutable.set({ endpoint: appName }, heapStats.total_heap_size_executable);
    v8TotalPhysicalSize.set({ endpoint: appName }, heapStats.total_physical_size);
    v8TotalAvailableSize.set({ endpoint: appName }, heapStats.total_available_size);
    v8UsedHeapSize.set({ endpoint: appName }, heapStats.used_heap_size);
    v8HeapSizeLimit.set({ endpoint: appName }, heapStats.heap_size_limit);
  };
}

var nodeMetricsTimer;

module.exports = function(appName) {
  if (nodeMetricsTimer) { return; }

  nodeMetricsTimer = setInterval(createCollector(appName), 5000);
  // Make sure the time doesn't block the process from stopping.
  nodeMetricsTimer.unref();
};
