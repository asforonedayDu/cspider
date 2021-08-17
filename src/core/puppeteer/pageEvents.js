const {callAndWaitFunc} = require('../libs/helper');

const filteredPageEvent = ['dialog', 'frameattached', 'framedetached', 'framenavigated', 'metrics', 'request',
  'requestfailed', 'requestfinished', 'response', 'workercreated', 'workerdestroyed', 'error', 'pageerror']

function handlerConsole(msg) {
  if (this.consoleHandler instanceof Function) {
    return this.consoleHandler(msg)
  }

  const consoleFunc = console[msg._type]
  const args = msg.args()
  if (args.length > 0) {
    const output = []
    for (let i = 0; i < args.length; ++i) {
      if (i === 0) {
        output[i] = `chrome console: ${args[0].toString().substr('JSHandle:'.length)}`
        continue
      }
      output[i] = `${args[i].toString().substr('JSHandle:'.length)}`
    }
    consoleFunc(...output)
  } else {
    consoleFunc(`chrome console: ${msg._text}`)
  }
}

async function closePageHandler(data) {
  await this._destroy()
}

// async function errorHandler(...args) {
//   // todo
// }
//
// async function pageErrorHandler(...args) {
//   // todo
// }

async function domcontentloadedHandler(...args) {
  if (this.enableJquery) await this.$page.addScriptTag({path: require.resolve('jquery')});
  await this.$bindPageState()
  await this.$bindPageMethods()
  await this.$injectInstanceFunc()
  this.$pageInjectSuccessResolve()
  return callAndWaitFunc.call(this, 'onDomcontentloaded', await this.$page.content())
}

async function onLoadHandler(...args) {
  await this.$pageInjectSuccessPromise
  return callAndWaitFunc.call(this, 'onLoaded', ...args)
}

function bindPageEvent() {
  this.__handlerConsole = handlerConsole.bind(this)
  this.__closePageHandler = closePageHandler.bind(this)
  this.__domcontentloadedHandler = domcontentloadedHandler.bind(this)
  this.__onLoadHandler = onLoadHandler.bind(this)
  if (this.showConsole || this.consoleHandler) {
    this.$page.on('console', this.__handlerConsole);
  }

  this.$page.on('close', this.__closePageHandler);

  this.$page.on('domcontentloaded', this.__domcontentloadedHandler);

  this.$page.on('load', this.__onLoadHandler);

  if (this.pageEvents) {
    if (!this.pageEvents instanceof Function) {
      throw new Error('pageEvents 必须是一个函数 返回对应的监听器对象')
    }
    const events = this.pageEvents()
    Object.keys(events).filter(key => {
      return filteredPageEvent.indexOf(key) > -1
    }).forEach(key => {
      this.$pageEvents[key] = (...args) => {
        Promise.resolve().then(() => {
          events[key].call(this, ...args)
        })
      }
      this.$page.on(key, this.$pageEvents[key]);
    })
  }
}

function removePageEvent() {
  this.$page.removeListener('console', this.__handlerConsole);

  this.$page.removeListener('close', this.__closePageHandler);

  this.$page.removeListener('domcontentloaded', this.__domcontentloadedHandler);

  this.$page.removeListener('load', this.__onLoadHandler);
  for (let key in this.$pageEvents) {
    this.$page.removeListener(key, this.$pageEvents[key]);
  }
}

module.exports = {
  bindPageEvent,
  removePageEvent
}