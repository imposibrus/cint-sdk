
var http = require('http'),
    https = require('https'),
    Promise = require('bluebird'),
    logger = require('../lib/logger');

class CintSDK {
  cintHost = 'cdp.cintworks.net';
  protocol = 'http';

  static noAuthResources = ['/', '/genders', '/statuses', '/transaction_types'];
  static xmlResources = [/^\/panels\/.[^\/]*\/questions$/];

  constructor({protocol = 'https', key = null, secret = null} = {}) {
    this.protocol = protocol;

    if(!key || !secret) {
      throw new Error('options `key` and `secret` are required');
    }

    this.key = key;
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

  getQuestions(key = this.key) {
    return this._request({path: '/panels/' + key + '/questions'});
  }

  getPanelists(key = this.key) {
    return this._request({path: '/panels/' + key + '/panelists'});
  }

  createPanelist(postData, key = this.key) {
    return this._request({method: 'POST', path: '/panels/' + key + '/panelists', postData: postData});
  }

  updatePanelist(postData, panelistId, key = this.key) {
    if(!panelistId) {
      throw new Error('Argument `panelistId` is required.');
    }
    return this._request({method: 'PATCH', path: '/panels/' + key + '/panelists/' + panelistId, postData: postData});
  }

  getPanelist(panelistId, key = this.key) {
    if(!panelistId) {
      throw new Error('Argument `panelistId` is required.');
    }
    return this._request({path: '/panels/' + key + '/panelists/' + panelistId});
  }

  getRespondents(key = this.key) {
    return this._request({path: '/panels/' + key + '/respondent'});
  }

  _request({method = 'GET', path = '/', postData} = {}) {
    return new Promise((resolve, reject) => {
      let requester = this.protocol == 'https' ? https : http,
          contentType = CintSDK.xmlResources.filter(regexp => regexp.test(path)).length ? 'application/xml' : 'application/json',
          headers = {
            Accept: contentType
          },
          requestOptions = {
            hostname: this.cintHost,
            path: path,
            method: method
          },
          _postData;

      if(CintSDK.noAuthResources.indexOf(path) == -1) {
        headers.Authorization = 'Basic ' + this.basicAuthString;
      }

      if(postData) {
        _postData = JSON.stringify(postData);
        headers['Content-Type'] = 'application/json';
        headers['Content-length'] = _postData.length;
        logger.debug('_request: request with postData: %:2j', _postData);
      }

      requestOptions.headers = headers;
      logger.debug('_request: request with params: %:2j', requestOptions);

      var request = requester.request(requestOptions, function(res) {
        var resData = '',
            resJSON = '';

        res.on('data', function(data) {
          resData += data;
        });
        res.on('end', function() {
          if(contentType == 'application/xml') {
            return resolve(resData);
          }

          logger.debug('_request: response statusCode:', res.statusCode);
          // TODO: empty body for several requests as valid answer
          try {
            resJSON = JSON.parse(resData);
          } catch(err) {
            logger.debug('_request: invalid response:', resData);
            return reject(new Error('Invalid JSON response:' + resData));
          }
          logger.debug('_request: response: %:2j', resJSON);
          resolve(resJSON);
        });
      }).on('error', reject);

      if(postData) {
        request.write(_postData);
      }

      request.end();
    });
  }
}

export default CintSDK;
