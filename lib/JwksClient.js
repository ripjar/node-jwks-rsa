'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JwksClient = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _request = require('./wrappers/request');

var _request2 = _interopRequireDefault(_request);

var _JwksError = require('./errors/JwksError');

var _JwksError2 = _interopRequireDefault(_JwksError);

var _SigningKeyNotFoundError = require('./errors/SigningKeyNotFoundError');

var _SigningKeyNotFoundError2 = _interopRequireDefault(_SigningKeyNotFoundError);

var _utils = require('./utils');

var _wrappers = require('./wrappers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JwksClient = exports.JwksClient = function () {
  function JwksClient(options) {
    var _this = this;

    _classCallCheck(this, JwksClient);

    this.getSigningKey = function (kid, cb) {
      _this.logger('Fetching signing key for \'' + kid + '\'');

      _this.getSigningKeys(function (err, keys) {
        if (err) {
          return cb(err);
        }

        var kidDefined = kid !== undefined && kid !== null;
        if (!kidDefined && keys.length > 1) {
          _this.logger('No KID specified and JWKS endpoint returned more than 1 key');
          return cb(new _SigningKeyNotFoundError2.default('No KID specified and JWKS endpoint returned more than 1 key'));
        }

        var key = keys.find(function (k) {
          return !kidDefined || k.kid === kid;
        });
        if (key) {
          return cb(null, key);
        } else {
          _this.logger('Unable to find a signing key that matches \'' + kid + '\'');
          return cb(new _SigningKeyNotFoundError2.default('Unable to find a signing key that matches \'' + kid + '\''));
        }
      });
    };

    this.getKeysAsync = promisifyIt(this.getKeys, this);
    this.getSigningKeysAsync = promisifyIt(this.getSigningKeys, this);
    this.getSigningKeyAsync = promisifyIt(this.getSigningKey, this);

    this.options = _extends({
      rateLimit: false,
      cache: true,
      timeout: 30000
    }, options);
    this.logger = (0, _debug2.default)('jwks');

    // Initialize wrappers.
    if (this.options.rateLimit) {
      this.getSigningKey = (0, _wrappers.rateLimitSigningKey)(this, options);
    }
    if (this.options.cache) {
      this.getSigningKey = (0, _wrappers.cacheSigningKey)(this, options);
    }

    if (this.options.rateLimit || this.options.cache) {
      this.getSigningKeyAsync = promisifyIt(this.getSigningKey, this);
    }
  }

  _createClass(JwksClient, [{
    key: 'getKeys',
    value: function getKeys(cb) {
      var _this2 = this;

      this.logger('Fetching keys from \'' + this.options.jwksUri + '\'');
      (0, _request2.default)({
        uri: this.options.jwksUri,
        strictSSL: this.options.strictSsl,
        headers: this.options.requestHeaders,
        agentOptions: this.options.requestAgentOptions,
        proxy: this.options.proxy,
        timeout: this.options.timeout
      }, function (err, res) {
        if (err) {
          var errorResponse = err.response;
          _this2.logger('Failure:', errorResponse && errorResponse.data || err);
          if (errorResponse) {
            return cb(new _JwksError2.default(errorResponse.data || errorResponse.statusText || 'Http Error ' + errorResponse.status));
          }
          return cb(err);
        }

        _this2.logger('Keys:', res.data.keys);
        return cb(null, res.data.keys);
      });
    }
  }, {
    key: 'getSigningKeys',
    value: function getSigningKeys(cb) {
      var _this3 = this;

      this.getKeys(function (err, keys) {
        if (err) {
          return cb(err);
        }

        if (!keys || !keys.length) {
          return cb(new _JwksError2.default('The JWKS endpoint did not contain any keys'));
        }

        var signingKeys = keys.filter(function (key) {
          if (key.kty !== 'RSA') {
            return false;
          }
          if (key.hasOwnProperty('use') && key.use !== 'sig') {
            return false;
          }
          return key.x5c && key.x5c.length || key.n && key.e;
        }).map(function (key) {
          var jwk = {
            kid: key.kid,
            alg: key.alg,
            nbf: key.nbf
          };
          var hasCertificateChain = key.x5c && key.x5c.length;
          if (hasCertificateChain) {
            jwk.publicKey = (0, _utils.certToPEM)(key.x5c[0]);
            jwk.getPublicKey = function () {
              return jwk.publicKey;
            };
          } else {
            jwk.rsaPublicKey = (0, _utils.rsaPublicKeyToPEM)(key.n, key.e);
            jwk.getPublicKey = function () {
              return jwk.rsaPublicKey;
            };
          }
          return jwk;
        });

        if (!signingKeys.length) {
          return cb(new _JwksError2.default('The JWKS endpoint did not contain any signing keys'));
        }

        _this3.logger('Signing Keys:', signingKeys);
        return cb(null, signingKeys);
      });
    }

    /**
     * Get all keys. Use this if you prefer to use Promises or async/await.
     *
     * @example
     * client.getKeysAsync()
     *   .then(keys => { console.log(`Returned {keys.length} keys`); })
     *   .catch(err => { console.error('Error getting keys', err); });
     *
     * // async/await:
     * try {
     *  let keys = await client.getKeysAsync();
     * } catch (err) {
     *  console.error('Error getting keys', err);
     * }
     *
     * @return {Promise}
     */


    /**
     * Get all signing keys. Use this if you prefer to use Promises or async/await.
     *
     * @example
     * client.getSigningKeysAsync()
     *   .then(keys => { console.log(`Returned {keys.length} signing keys`); })
     *   .catch(err => { console.error('Error getting keys', err); });
     *
     * // async/await:
     * try {
     *  let keys = await client.getSigningKeysAsync();
     * } catch (err) {
     *  console.error('Error getting signing keys', err);
     * }
     *
     * @return {Promise}
     */


    /**
     * Get a signing key for a specified key ID (kid). Use this if you prefer to use Promises or async/await.
     *
     * @example
     * client.getSigningKeyId('someKid')
     *   .then(key => { console.log(`Signing key returned is {key.getPublicKey()}`); })
     *   .catch(err => { console.error('Error getting signing key', err); });
     *
     * // async/await:
     * try {
     *  let key = await client.getSigningKeyAsync('someKid');
     * } catch (err) {
     *  console.error('Error getting signing key', err);
     * }
     *
     * @param {String} kid   The Key ID of the signing key to retrieve.
     *
     * @return {Promise}
     */

  }]);

  return JwksClient;
}();

var promisifyIt = function promisifyIt(fn, ctx) {
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
      fn.call.apply(fn, [ctx].concat(args, [function (err, data) {
        if (err) {
          reject(err);
        }
        resolve(data);
      }]));
    });
  };
};