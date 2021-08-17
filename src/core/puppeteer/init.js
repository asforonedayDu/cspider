const Puppeteer = require('puppeteer');
const setProxy = require('./proxy')
const initPageFunc = require('./pageHandler')
const initBrowserFunc = require('./browserHandler')
const _ = require('lodash')

let lunchOptions = {
  args: [
    // '--no-sandbox',
    // '--disable-setuid-sandbox',
  ]
}
let userAgent = ''

function initGlobalApi(Spider) {
  Spider.__proto__.setProxy = (oldProxyUrl) => {
    setProxy(oldProxyUrl, lunchOptions)
  }
  Spider.__proto__.onBeforeLunch = function (callback) {
    Spider.prototype.runOnBeforeLunch = callback
  }
}

function injectInstanceFun(Spider) {
  initBrowserFunc(Spider, lunchOptions)
  initPageFunc(Spider)

}


function initPuppeteer(Spider) {
  initGlobalApi(Spider)
  injectInstanceFun(Spider)
}

module.exports = initPuppeteer
