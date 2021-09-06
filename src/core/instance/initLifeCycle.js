const {callAndWaitFunc} = require('../libs/helper');

let instanceId = 1

function initLifeCycle(Spider) {
  Spider.prototype.__allInstance__ = {}
  Spider.prototype.initInstance = async function () {
    Reflect.defineProperty(this, 'id', {
      writable: false,
      enumerable: true,
      value: instanceId++
    })
    this.__proto__.__allInstance__[this.id] = this
    this.$pageObject = `\$SC${this.id}`
    this.$pageResponsePromise = new Promise(resolve => {
      this.$pageResponseResolve = resolve
    })
    this.$pageInjectSuccessPromise = new Promise(resolve => {
      this.$pageInjectSuccessResolve = resolve
    })
    this.$pageEvents = {
      onRedirect: () => {
      },
      onCreateNewPage: () => {
      },
    }
    this.$history = []
    this.initQueue()
    this.enableJquery = true
  }

  Spider.prototype.onPageIdle = async function () {
    return new Promise(async (resolve) => {
      await this.$pageResponsePromise
      await this.$page.waitFor(100)
      setTimeout(resolve)
    })
  }

  Spider.prototype.lunch = async function () {
    await callAndWaitFunc.call(this, 'beforeOpenPage')
    this.$openPage(this.url).then()
  }

  Spider.prototype._beforeDestroy = async function () {
    if (this._beforeDestroyCalled) return
    this._beforeDestroyCalled = true
    await callAndWaitFunc.call(this, 'beforeDestroy')
  }

  Spider.prototype._destroy = async function () {
    if (this.$destroying) return
    this.$destroying = true
    this.$removePageEvent()
    this.$removeBrowserEvent()
    this.notifyQueue()
    this.$destroyed = true
    await callAndWaitFunc.call(this, 'destroyed')
    delete this.__proto__.__allInstance__[this.id]
  }
}

module.exports = initLifeCycle
