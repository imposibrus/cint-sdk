
var http = require('http'),
    https = require('https'),
    Promise = require('bluebird'),
    logger = require('../lib/logger');

http.request({
  host: 'cdp.cintworks.net',
  path: '/'
}, function(res) {
  var respData = '';

  res.on('data', function(data) {
    respData += data;
  });
  res.on('end', function() {
    console.log(respData);
  });
});

class CintSDK {
  cintHost = 'cdp.cintworks.net';
  protocol = 'http';

  static noAuthResources = ['/', '/genders', '/statuses', '/transaction_types'];

  constructor({protocol = 'https'} = {}) {
    this.protocol = protocol;
  }

  setAuth(key = null, secret = null) {
    if(!key || !secret) {
      throw new Error('options `key` and `secret` are required');
    }

    this.basicAuthString = new Buffer(key + ':' + secret).toString('base64');
  }

  getMain() {
    return this._request();
  }

  getPanel(panelId) {
    if(!panelId) {
      throw new Error('Argument `panelId` is required.');
    }

    return this._request({path: '/panels/' + panelId});
  }

  getSetting() {
    return this._request({path: '/panel/settings'});
  }

  getGenders() {
    return this._request({path: '/genders'});
  }

  _request({method = 'GET', path = '/'} = {}) {
    return new Promise((resolve, reject) => {
      // TODO: protocol
      logger.debug('_request: request with params %:2j:', {hostname: this.cintHost, path: path, method: method});
      let requester = this.protocol == 'https' ? https : http,
          headers = {
            Accept: 'application/json'
          };

      if(CintSDK.noAuthResources.indexOf(path) == -1) {
        if(!this.basicAuthString) {
          throw new Error('This method requires authentication. You must `setAuth` with `key` and `secret` first.');
        }

        headers.Authorization = 'Basic ' + this.basicAuthString;
      }

      var request = requester.request({
        hostname: this.cintHost,
        path: path,
        method: method,
        headers: headers
      }, function(res) {
        var resData = '',
            resJSON = '';

        res.on('data', function(data) {
          resData += data;
        });
        res.on('end', function() {
          try {
            resJSON = JSON.parse(resData);
          } catch(err) {
            return reject(new Error('Invalid JSON response:' + resData));
          }
          logger.debug('_request: response: %:2j', resJSON);
          resolve(resJSON);
        });
      }).on('error', reject);

      request.end();
    });
  }
}

export default CintSDK;
