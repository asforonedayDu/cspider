const {getTargetPageInstance} = require("./libs");
const {callAndWaitFunc} = require('../libs/helper');

const Puppeteer = require('puppeteer');
const _ = require('lodash')

function initBrowser(browser, Spider) {

}

async function closeBrowserListener() {
  await this._destroy()
}

function bindBrowser(browser) {
  closeBrowserListener = closeBrowserListener.bind(this)
  browser.on('disconnected', closeBrowserListener)
  browser.on('targetchanged', async (browserContext) => {
    const page = getTargetPageInstance.call(this, browserContext._targetInfo.targetId)
    if (page) {
      page.$history.push(browserContext._targetInfo.url)
      await callAndWaitFunc.call(page, 'onRedirect', ...page.$history.slice().reverse())
    } else {
      // console.log('not found target', browserContext._targetInfo.url)
    }
  })
  browser.on('targetcreated', async (browserContext) => {
    const originPageId = browserContext._targetInfo.openerId
    const originPage = getTargetPageInstance.call(this, originPageId)
    if (originPage) {
      const page = await browserContext.page()
      if (page) {
        setTimeout(() => {
          if (!page.$isCatched) {
            page.close()
          }
        }, 5000)
        await callAndWaitFunc.call(originPage, 'onCreateNewPage', page)
      } else {
        // console.log('create new null page from origin page', originPageId, browserContext._targetInfo)
      }
    }
  })
  browser.on('targetdestroyed', async (browserContext) => {
    const page = getTargetPageInstance.call(this, browserContext._targetInfo.targetId)
    if (page) {
      await page._destroy()
    } else {
      // console.log('not found target destroyed', browserContext.url())
    }
  })
}

function initBrowserFunc(Spider, lunchOptions) {
  const spiderPrototype = Spider.prototype
  spiderPrototype.openBrowser = async function () {
    if (!spiderPrototype.$browser) {
      const runOnBeforeLunch = spiderPrototype.runOnBeforeLunch
      if (runOnBeforeLunch && (runOnBeforeLunch instanceof Function || runOnBeforeLunch instanceof Promise)) {
        const options = await runOnBeforeLunch(Puppeteer)
        if (options instanceof Object) {
          lunchOptions = _.merge(lunchOptions, options)
        }
      }
      spiderPrototype.lunchOptions = lunchOptions
      const browser = await Puppeteer.launch(lunchOptions);
      initBrowser(browser, Spider)
      spiderPrototype.$browser = browser
    }
    bindBrowser.call(this, this.$browser)
  }

  spiderPrototype.$closeBrowser = async function (forceClose = false) {
    for (let id in this.__proto__.__allInstance__) {
      // await this.__proto__.__allInstance__[id]._beforeDestroy()
      await this.__proto__.__allInstance__[id].$closePage()
    }
    await this.onIdle()
    if (this.$browser) {
      setTimeout(async () => {
        await this.$browser.close();
      })
    }
  }

  spiderPrototype.$removeBrowserEvent = async function (forceClose = false) {
    this.$browser.removeListener('disconnected', closeBrowserListener)
  }

}

module.exports = initBrowserFunc
