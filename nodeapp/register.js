var uuid = require('node-uuid');
var consul = require('consul');
var appUuid = uuid.v4();

module.exports = function(options, callback) {
  var client = consul({
    host: process.env['CONSUL_HOST'],
    port: process.env['CONSUL_PORT']
  });

  client.agent.service.register({
    name: options.app,
    id: options.app + '_' + options.appID,
    tags: options.tags,
    address: options.address,
    port: options.port,
    check: options.check
  }, function(err) {
    if (err) { return callback(err); }
    callback('ok');
  });
}
