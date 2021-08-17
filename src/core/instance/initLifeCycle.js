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
    this.pageObject = `\$SC${this.id}`
    this.$pageResponsePromise = new Promise(resolve => {
      this.$pageResponseResolve = resolve
    })
    this.$pageInjectSuccessPromise = new Promise(resolve => {
      this.$pageInjectSuccessResolve = resolve
    })
    this.$pageEvents = {}
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
    if (this.beforeOpenPage && (this.beforeOpenPage instanceof Function || this.beforeOpenPage instanceof Promise)) {
      await this.beforeOpenPage()
    }
    this.$openPage(this.url).then()
  }

  Spider.prototype._beforeDestroy = async function () {
    if (this._beforeDestroyCalled) return
    this._beforeDestroyCalled = true
    if (this.beforeDestroy) {
      await this.beforeDestroy()
    }
  }

  Spider.prototype._destroy = async function () {
    if (this.$destroying) return
    this.$destroying = true
    this.$removePageEvent()
    this.$removeBrowserEvent()
    this.notifyQueue()
    this.destroied = true
    if (this.destroyed) {
      await this.destroyed()
    }
    delete this.__proto__.__allInstance__[this.id]
  }
}

module.exports = initLifeCycle
