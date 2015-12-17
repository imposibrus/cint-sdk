
import http from 'http';
import https from 'https';
import querystring from 'querystring';
import util from 'util';
import Promise from 'bluebird';
import logger from '../lib/logger';

import _find from 'lodash.find';

class CintSDK {
  cintHost = 'api.cint.com';
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

  getPanelists(searchParams, key = this.key) {
    if(!searchParams) {
      throw new Error('argument `searchParams` must have `member_id` or `email` property.');
    }
    return this._request({path: '/panels/' + key + '/panelists?' + querystring.stringify(searchParams)});
  }

  deletePanelist(panelistId, key = this.key) {
    return this._request({method: 'DELETE', path: '/panels/' + key + '/panelists/' + panelistId});
  }

  createPanelist(postData, key = this.key) {
    return this._request({method: 'POST', path: '/panels/' + key + '/panelists', postData});
  }

  updatePanelist(postData, panelistId, key = this.key) {
    if(!panelistId) {
      throw new Error('Argument `panelistId` is required.');
    }
    return this._request({method: 'PATCH', path: '/panels/' + key + '/panelists/' + panelistId, postData});
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

  candidateRespondent(postData, panelistId, key = this.key) {
    if(!panelistId) {
      throw new Error('Argument `panelistId` is required.');
    }
    return this._request({
      method: 'POST',
      path: '/panels/' + key + '/panelists/' + panelistId + '/candidate_respondents',
      postData
    }).then((candidateData) => new CandidateRespondent(candidateData) );
  }

  getRespondentQuotas(key = this.key) {
    return this._request({path: '/panels/' + key + '/respondent_quotas'});
  }

  getEvents(key = this.key) {
    return this._request({path: '/panels/' + key + '/events'});
  }

  getSurveyInvitations(panelistId, key = this.key) {
    return this._request({path: '/panels/' + key + '/panelists/'+ panelistId +'/survey_invitations'});
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

        if(res.statusCode == 204) {
          return resolve({});
        }

        res.on('data', function(data) {
          resData += data;
        });
        res.on('end', function() {
          if(contentType == 'application/xml') {
            return resolve(resData);
          }

          logger.debug('_request: response statusCode:', res.statusCode);
          try {
            resJSON = JSON.parse(resData);
          } catch(err) {
            logger.debug('_request: invalid response:', resData);
            return reject(new Error('Invalid JSON response:' + resData));
          }
          logger.debug('_request: response: %.-500s', util.inspect(resJSON));
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

class CandidateRespondent {
  constructor(props, cintSDKInstance) {
    this._properties = props;
    this.cintSDKInstance = cintSDKInstance;
  }

  get params() {
    return this._properties.respondent_params;
  }

  get linkStart() {
    return _find(this._properties.links, {rel: 'start'}).href;
  }
}

export default CintSDK;
export {CandidateRespondent as CandidateRespondent};
