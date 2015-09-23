var request = require('hyperquest');

module['exports'] = function runRemoteService (opts) {

  opts.pool = opts.pool || [{ host: "0.0.0.0", port: "10000"} ];

  var pool = opts.pool;
  return function runRemoteServiceHandler (req, res) {
    var w = pool.pop();
    pool.unshift(w);
    // TODO: make https configurable
    var _url = 'http://' + w.host + ':' + w.port + req.url;
    console.log('about to use worker', _url);

    if (typeof req.headers["x-forwarded-for"] !== 'undefined' && req.headers["x-forwarded-for"].length > 0) {
      // preserve existing x-forwarded-for header
      // TODO: the correct behavior here is to append the IP to the header as a comman separated list.
    } else {
      req.headers["X-Forwarded-For"] = req.connection.remoteAddress;
    }

    var stream = request.post(_url, {
      headers: req.headers
    });

    stream.on('error', function (err){
      console.log('WORKER STREAM ERROR', err)
      // Should we comment out this error handling?
      // do nothing...
      res.write('Error communicating with worker ' + _url + '\n\n');
      res.write('The streaming connection errored in recieving data.\n\n');
      res.write('Please copy and paste this entire error message to Support.\n\n');
      res.end(err.stack)
    });

    req.pipe(stream).pipe(res);

    stream.on('response', function (response) {
      // replay all headers except set-cookie ( to preserve session )
      for (var p in response.headers) {
        // Remark: Don't overwrite the passport session on server
        // This may cause issues with user hooks which intend to modify cookies
        if (p !== "set-cookie") {
          res.setHeader(p, response.headers[p])
        }
      }
      // replay the status code
      res.writeHead(response.statusCode);
    });  
  };

};