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
}

function initBrowserFunc(Spider, lunchOptions) {
  const spiderPrototype = Spider.prototype
  spiderPrototype.openBrowser = async function () {
    if (!spiderPrototype.browser) {
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
      spiderPrototype.browser = browser
    }
    this.$browser = spiderPrototype.browser
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
    this.browser.removeListener('disconnected', closeBrowserListener)
  }

}

module.exports = initBrowserFunc
