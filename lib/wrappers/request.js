'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = function (options, cb) {
  var requestOptions = {
    url: options.uri,
    headers: options.headers,
    timeout: options.timeout
  };

  var proxyUrl = options.proxy || (0, _proxyFromEnv.getProxyForUrl)(options.uri);
  if (proxyUrl || options.agentOptions || options.strictSSL != undefined) {
    var agentOptions = _extends({}, options.strictSSL != undefined && { rejectUnauthorized: options.strictSSL }, options.headers && { headers: options.headers }, options.agentOptions);

    if (proxyUrl) {
      // Axios proxy workaround: https://github.com/axios/axios/issues/2072
      var proxyOptions = _url2.default.parse(proxyUrl);
      requestOptions.proxy = false; //proxyParsed
      var proxyAgentOptions = _extends({}, agentOptions, proxyOptions);
      var httpsProxy = new _httpsProxyAgent2.default(proxyAgentOptions);
      requestOptions.httpAgent = httpsProxy;
      requestOptions.httpsAgent = httpsProxy;
    } else {
      requestOptions.httpAgent = new _http2.default.Agent(agentOptions);
      requestOptions.httpsAgent = new _https2.default.Agent(agentOptions);
    }
  }

  (0, _axios.request)(requestOptions).then(function (response) {
    return cb(null, response);
  }).catch(function (err) {
    return cb(err);
  });
};

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _httpProxyAgent = require('http-proxy-agent');

var _httpProxyAgent2 = _interopRequireDefault(_httpProxyAgent);

var _httpsProxyAgent = require('https-proxy-agent');

var _httpsProxyAgent2 = _interopRequireDefault(_httpsProxyAgent);

var _axios = require('axios');

var _proxyFromEnv = require('proxy-from-env');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }