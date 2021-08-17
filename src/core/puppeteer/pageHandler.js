const {deepProxy} = require("./libs");

const {callAndWaitFunc} = require('../libs/helper');

const {bindPageEvent, removePageEvent} = require('./pageEvents')

async function bindPageState() {
  await this.$page.evaluate(function (key, state) {
    // debugger
    window[key] = JSON.parse(state)
  }, this.pageObject, JSON.stringify(this.state))
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
    }, type, this.pageObject, {key, value, parents})
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
  const ReflectOwnKeys = Reflect.ownKeys(this)
  for (const key of Object.keys(methods)) {
    if (this[key] || ReflectOwnKeys.indexOf(key) > -1) {
      throw new Error(`${key} 该属性已存在`)
    }
    if (!methods[key] instanceof Function) {
      console.error('pageMethods 返回对象的值必须为函数')
      continue;
    }
    const fnString = methods[key].toString()

    await this.$page.evaluate(bindMethodInPage, this.pageObject, key, fnString);

    await this.$page.exposeFunction(key, async (...args) => {
      return await callAndWaitFunc.call(this, key, ...args)
    })

    Reflect.set(this, key, async (...args) => {
      if (this.destroied) {
        throw new Error(`page is already closed! unable to run method ${key} in instance ${this.id}`)
      }
      let result
      try {
        result = await this.$page.evaluate(evaluateInPage, this.pageObject, key, fnString, ...args)
      } catch (e) {
        const messageArray = e.message.split('\n')
        throw new Error(`Error in pageMethod \'${key}\' :\n ${messageArray[0]}\n${messageArray[1]} \n ${fnString}`)
      }
      return result
    })
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
  const ReflectOwnKeys = Reflect.ownKeys(this)
  for (const key of Object.keys(methods)) {
    if (this[key] || ReflectOwnKeys.indexOf(key) > -1) {
      throw new Error(`${key} 该属性已存在`)
    }
    if (!methods[key] instanceof Function) {
      console.error('exposeFunction 返回对象的值必须为函数')
      continue;
    }

    await this.$page.exposeFunction(key, async (...args) => {
      return await callAndWaitFunc.call(this, key, ...args)
    })

    await this.$page.evaluate(bindMethodInPage, this.pageObject, key);

    // Reflect.set(this, shadowKey, methods[key])
    Reflect.set(this, key, (...args) => {
      return methods[key].call(this, ...args)
    })
  }
}

async function preparePage() {
  await initialState.call(this)
  if (this.$pageEvents.request || this.$pageEvents.requestfailed || this.$pageEvents.requestfinished || this.$pageEvents.response) {
    await this.$page.setRequestInterception(true);
  }

  if (this.userAgent) {
    await this.$page.setUserAgent(this.userAgent)
  }

  if (this.cookies && this.cookies instanceof Array) {
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
    await this.openBrowser()
    this.$page = await this.$browser.newPage();
    bindPageEvent.call(this)
    await preparePage.call(this)
    this.$pageResponse = await this.$page.goto(url);
    if (this.waitFor) {
      await this.$page.waitFor(this.waitFor);
    }
    this.$pageResponseResolve()
  }

  Spider.prototype.$removePageEvent = removePageEvent

  Spider.prototype.$bindPageState = bindPageState

  Spider.prototype.$bindPageMethods = bindPageMethods

  Spider.prototype.$injectInstanceFunc = injectInstanceFunc

  Spider.prototype.$closePage = async function () {
    if (this.destroied) return
    await this._beforeDestroy()
    await this.onPageIdle()
    this.notifyQueue()
    return await this.$page.close();
    // let awaitResolve
    // const awaitP = new Promise(resolve => {
    //   awaitResolve = resolve
    // })
    // setTimeout(async () => {
    //   await this.$page.close();
    //   awaitResolve()
    // })
    // return awaitP
  }
}

module.exports = initPageFunc
