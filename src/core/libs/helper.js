const {inspect} = require('util');
const {parse, resolve, format} = require('url');
const crypto = require('crypto');
const pick = require('lodash/pick');
const trim = require('lodash/trim');
const startsWith = require('lodash/startsWith');
const some = require('lodash/some');
const includes = require('lodash/includes');
const isPlainObject = require('lodash/isPlainObject');
const isRegExp = require('lodash/isRegExp');

const PICKED_OPTION_FIELDS = [
  'url',
  'device',
  'userAgent',
  'extraHeaders',
];
const MAX_KEY_LENGTH = 10;

class Helper {
  /**
   * @param {!number} milliseconds
   * @return {!Promise}
   */
  static delay(milliseconds) {
    return new Promise(_resolve => setTimeout(_resolve, milliseconds));
  }

  static async callAndWaitFunc(funcName, ...args) {
    if (this[funcName] && (this[funcName] instanceof Promise || this[funcName] instanceof Function)) {
      return await this[funcName](...args)
    }
  }

  /**
   * @param {!string} src
   * @return {!string}
   */
  static hash(src) {
    const md5hash = crypto.createHash('md5');
    md5hash.update(src, 'utf8');
    return md5hash.digest('hex');
  }

  /**
   * @param {!Object} options
   * @return {!string}
   */
  static generateKey(options) {
    const json = JSON.stringify(pick(options, PICKED_OPTION_FIELDS), Helper.jsonStableReplacer);
    return Helper.hash(json).substring(0, MAX_KEY_LENGTH);
  }

  /**
   * @param {!string} key
   * @param {?*} val
   * @return {!Object}
   */
  static jsonStableReplacer(key, val) {
    if (!isPlainObject(val)) return val;
    return Object.keys(val).sort().reduce((obj, _key) => {
      obj[_key] = val[_key];
      return obj;
    }, {});
  }

  /**
   * @param {!string} url
   * @param {!string} baseUrl
   * @return {!string}
   */
  static resolveUrl(url, baseUrl) {
    url = trim(url);
    if (!url) return null;
    if (startsWith(url, '#')) return null;
    const {protocol} = parse(url);
    if (includes(['http:', 'https:'], protocol)) {
      return url.split('#')[0];
    } else if (!protocol) {
      return resolve(baseUrl, url).split('#')[0];
    }
    return null;
  }

  /**
   * @param {!string} value
   * @param {!string=} separator
   * @return {!string}
   */
  static escapeQuotes(value, separator = ',') {
    if (value === null || value === undefined) return '';
    const regExp = new RegExp(`["${separator}\\r\\n]`);
    if (regExp.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  /**
   * @param {!string} url
   * @return {!string}
   * @private
   */
  static getRobotsUrl(url) {
    const {protocol, host} = parse(url);
    return format({protocol, host, pathname: '/robots.txt'});
  }

  // Ported from http://en.cppreference.com/w/cpp/algorithm/lower_bound
  static lowerBound(array, value, comp) {
    let first = 0;
    let count = array.length;
    while (count > 0) {
      const step = (count / 2) | 0;
      let it = first + step;
      if (comp(array[it], value) <= 0) {
        it += 1;
        first = it;
        count -= step + 1;
      } else {
        count = step;
      }
    }
    return first;
  }

  /**
   * @param {!Array<!string|RegExp>} domains
   * @param {!string} hostname
   * @return {!boolean}
   */
  static checkDomainMatch(domains, hostname) {
    return some(domains, domain => {
      if (isRegExp(domain)) return domain.test(hostname);
      return domain === hostname;
    });
  }

  /**
   * @param {!string} sitemapXml
   * @return {!Array<!string>}
   */
  static getSitemapUrls(sitemapXml) {
    const urls = [];
    sitemapXml.replace(/<loc>([^<]+)<\/loc>/g, (_, url) => {
      const unescapedUrl = Helper.unescape(url);
      urls.push(unescapedUrl);
      return null;
    });
    return urls;
  }

  /**
   * @param {!string} src
   * @return {!string}
   */
  static unescape(src) {
    return src
      .replace(/&amp;/g, '&')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  /**
   * @param {!Object} arg
   * @return {!string}
   */
  static stringifyArgument(arg) {
    return inspect(arg)
      .split('\n')
      .map(line => trim(line))
      .join(' ');
  }

}

module.exports = Helper;
