var request = require('hyperquest');

module['exports'] = function runRemoteService (opts) {

  var errorHandler = opts.errorHandler || function (err, req, res) {
    res.write('Error communicating with ' + req.url + '\n\n');
    res.write('The streaming connection errored in recieving data.\n\n');
    res.write('Please copy and paste this entire error message to Support.' + '\n\n');
    // TODO: unified error log event schema
    res.write(JSON.stringify({ time: new Date(), ip: req.connection.remoteAddress })+ '.\n\n');
    res.end(err.stack)
  };

  opts.pool = opts.pool || [{ host: "0.0.0.0", port: "10000"} ];
  var pool = opts.pool;

  return function runRemoteServiceHandler (req, res) {
    var w = pool.pop();
    pool.unshift(w);
    console.log(new Date(), w.host, w.port, req.method, req.url, req.params);
    // TODO: make https configurable
    var _url = 'http://' + w.host + ':' + w.port + req.url;
    // console.log(new Date().toString() + ' - about to use worker', _url);

    if (typeof req.headers["x-forwarded-for"] !== 'undefined' && req.headers["x-forwarded-for"].length > 0) {
      // preserve existing x-forwarded-for header
      // TODO: the correct behavior here is to append the IP to the header as a comman separated list.
    } else {
      req.headers["X-Forwarded-For"] = req.connection.remoteAddress;
    }

    // hook.io specific header hack for passing along current session user name
    if (typeof req.session !== "undefined" && typeof req.session.user !== "undefined") {
      req.headers["X-Hookio-User-Session-Name"] = req.session.user;
    }

    var stream = request(_url, {
      method: req.method,
      headers: req.headers
    });

    stream.on('error', function (err){
      // console.log('WORKER STREAM ERROR', err)
      // console.log(res.finished)
      if (!res.finished) {
        return errorHandler(err, req, res);
      }
    });

    if (req.method === "POST") { // TODO: pipe requests from other verbs?
      req.pipe(stream).pipe(res);
    } else {
      stream.pipe(res);
    }

    stream.on('response', function (response) {
      // replay all headers except set-cookie ( to preserve session )
      for (var p in response.headers) {
        //console.log('attempting to write head', p , response.headers[p])
        try {
          res.setHeader(p, response.headers[p])
        } catch (err) {
          console.log('warning, bad headers', p, err.message)
        }
      }
      // replay the status code
      try {
        res.writeHead(response.statusCode);
      } catch (err) {
        console.log('warning, bad headers', err.message)
      }
    });
  };

};