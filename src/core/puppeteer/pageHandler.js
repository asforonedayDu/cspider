const {deepProxy, setBrowserPage} = require("./libs");

const {callAndWaitFunc} = require('../libs/helper');

const {bindPageEvent, removePageEvent} = require('./pageEvents')

async function bindPageState() {
  await this.$page.evaluate(function (key, state) {
    window[key] = JSON.parse(state)
  }, this.$pageObject, JSON.stringify(this.state))
}

async function initialState() {
  if (this.state === undefined) this.state = {}
  const desc = Object.getOwnPropertyDescriptor(this, 'state')
  // prevent change state assignment
  if (!desc.writable) return
  if (typeof this.state !== 'object' || Array.isArray(this.state)) {
    throw new Error('state must be type of object')
  }

  const handleStateProxy = async (type, {target, key, value, parents = []}) => {
    await this.$page.evaluate(function (type, instanceName, {key, value, parents = []}) {
      // debugger
      let target = window[instanceName]
      for (let key of parents) {
        target = target[key]
      }
      if (type === 'delete') {
        return Reflect.deleteProperty(target, key)
      }
      return Reflect.set(target, key, value)
    }, type, this.$pageObject, {key, value, parents})
  }
  const proxyState = deepProxy(this.state, handleStateProxy)
  Reflect.defineProperty(this, 'state', {
    writable: false,
    enumerable: false,
    value: proxyState
  })
}

async function bindPageMethods() {
  if (!this.pageMethods) return
  if (!this.pageMethods instanceof Function) {
    throw new Error('pageMethods 必须是一个函数')
  }
  const bindMethodInPage = function (inName, key, fnString) {
    eval(`window['${inName}']['${key}']=${fnString}`)
  }
  const evaluateInPage = function (instanceKey, fnKey, fnString, ...args) {
    if (!window[instanceKey][fnKey]) {
      eval(`window['${instanceKey}']['${fnKey}']=(${fnString}).bind(window['${instanceKey}'])`)
    }
    return Promise.resolve(window[instanceKey][fnKey](...args))
  }
  const methods = this.pageMethods()
  // const ReflectOwnKeys = Reflect.ownKeys(this)
  for (const key of Object.keys(methods)) {
    // if (this[key] || ReflectOwnKeys.indexOf(key) > -1) {
    //     throw new Error(`${key} 该属性已存在`)
    // }
    if (!methods[key] instanceof Function) {
      console.error('pageMethods 返回对象的值必须为函数')
      continue;
    }
    const desc = Object.getOwnPropertyDescriptor(this, key)
    if (!desc || desc.writable) {
      Reflect.defineProperty(this, key, {
        writable: false,
        enumerable: false,
        value: async (...args) => {
          if (this.$destroyed) {
            throw new Error(`page is already closed! unable to run method ${key} in instance ${this.id}`)
          }
          let result
          try {
            result = await this.$page.evaluate(evaluateInPage, this.$pageObject, key, fnString, ...args)
          } catch (e) {
            const messageArray = e.message.split('\n')
            throw new Error(`Error in pageMethod \'${key}\' :\n ${messageArray[0]}\n${messageArray[1]} \n ${fnString}`)
          }
          return result
        }
      })
      await this.$page.exposeFunction(key, async (...args) => {
        return await callAndWaitFunc.call(this, key, ...args)
      })
    }
    const fnString = methods[key].toString()
    await this.$page.evaluate(bindMethodInPage, this.$pageObject, key, fnString);
  }
}

async function injectInstanceFunc() {
  if (!this.exposeFunction) return
  if (!this.exposeFunction instanceof Function) {
    throw new Error('exposeFunction 必须是一个函数')
  }
  const bindMethodInPage = function (inName, key) {
    eval(`window['${inName}']['${key}']=window.${key}.bind(window['${inName}'])`)
  }
  const methods = this.exposeFunction()
  // const ReflectOwnKeys = Reflect.ownKeys(this)
  for (const key of Object.keys(methods)) {
    // if (this[key] || ReflectOwnKeys.indexOf(key) > -1) {
    //     throw new Error(`${key} 该属性已存在`)
    // }
    if (!methods[key] instanceof Function) {
      console.error('exposeFunction 返回对象的值必须为函数')
      continue;
    }
    const desc = Object.getOwnPropertyDescriptor(this, key)
    if (!desc || desc.writable) {
      await this.$page.exposeFunction(key, async (...args) => {
        return await callAndWaitFunc.call(this, key, ...args)
      })

      await this.$page.evaluate(bindMethodInPage, this.$pageObject, key);
      Reflect.defineProperty(this, key, {
        writable: false,
        enumerable: false,
        value: (...args) => {
          return methods[key].call(this, ...args)
        }
      })
    }
  }
}

async function preparePage() {
  await initialState.call(this)
  // if (this.$pageEvents.request || this.$pageEvents.requestfailed || this.$pageEvents.requestfinished || this.$pageEvents.response) {
  //     await this.$page.setRequestInterception(true);
  // }
  await this.$page.setRequestInterception(true);

  if (this.userAgent) {
    await this.$page.setUserAgent(this.userAgent)
  }

  if (this.cookies && this.cookies instanceof Array) {
    await this.$page.deleteCookie(...this.cookies)
    await this.$page.setCookie(...this.cookies)
  }

  if (this.extraHeaders && typeof this.extraHeaders === 'object') {
    await this.$page.setExtraHTTPHeaders(this.extraHeaders)
  }
  if (this.viewPort) {
    await this.$page.setViewport(this.viewPort)
  }
}

function initPageFunc(Spider, lunchOptions) {
  Spider.prototype.$openPage = async function (url) {
    this.$history.push(this.url)
    await this.openBrowser()
    this.$page = await this.$browser.newPage();
    this.$targetId = this.$page._target._targetId
    bindPageEvent.call(this)
    await preparePage.call(this)
    await setBrowserPage(this.$page)
    try {
      await Promise.all([
        this.$page.waitForNavigation({timeout: 15000, waitUntil: 'domcontentloaded'}),
        this.$page.goto(url)
      ]);
    } catch (e) {
      // console.log('error in page wait for navigation')
    }
    this.$pageResponseResolve()
  }

  Spider.prototype.$catchPage = async function (page) {
    page.$isCatched = true
    this.url = page.url()
    this.$history.push(this.url)
    this.$page = page;
    this.$targetId = page._target._targetId
    await callAndWaitFunc.call(this, 'beforeOpenPage')
    bindPageEvent.call(this)
    await preparePage.call(this)
    await setBrowserPage(this.$page)
    let state
    try {
      state = await page.evaluate(function () {
        return document.readyState
      })
    } catch (e) {
    }
    if (state === 'complete') {
      await this.__domcontentloadedHandler()
      await this.__onLoadHandler()
    }
    this.$pageResponseResolve()
  }

  Spider.prototype.$removePageEvent = removePageEvent

  Spider.prototype.$bindPageState = bindPageState

  Spider.prototype.$bindPageMethods = bindPageMethods

  Spider.prototype.$injectInstanceFunc = injectInstanceFunc

  Spider.prototype.$closePage = async function () {
    if (this.$destroyed) return
    await this._beforeDestroy()
    await this.onPageIdle()
    this.notifyQueue()
    return await this.$page.close();
  }
}

module.exports = initPageFunc
