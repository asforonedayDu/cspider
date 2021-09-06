const PriorityQueue = require('../quque/priority-queue')
const baseQueue = require('../quque/base-queue')
const path = require('path')
const defaultMaxConcurrency = 10

function initCacheAndQueue(Spider) {
  const spiderPrototype = Spider.prototype
  Spider.__proto__.setCustomQueue = function (queueInstance) {
    const keys = Reflect.ownKeys(baseQueue.prototype)
    for (let funcName of keys) {
      if (funcName === 'constructor') continue
      if (!queueInstance[funcName]) {
        throw new Error(`自定义队列必须实现\'${funcName}\'方法`)
      }
    }
    spiderPrototype.$queue = Queue
  }

  Spider.__proto__.setMaxConcurrency = function (maxConcurrency) {
    spiderPrototype.maxConcurrency = maxConcurrency
  }
  spiderPrototype.maxConcurrency = defaultMaxConcurrency

  spiderPrototype.onIdle = async function () {
    await this.onPageIdle()
    this.notifyQueue()
    await this.$queue.onIdle()
  }

  spiderPrototype.notifyQueue = async function () {
    if (!this._notifiedQueue && !this.$page.$isCatched) {
      this.$queue.onPageClosed(this.id)
      this._notifiedQueue = true
    }
  }

  spiderPrototype.initQueue = async function () {
    if (!this.$queue) {
      spiderPrototype.$queue = new PriorityQueue({
        maxConcurrency: this.maxConcurrency,
      });
      spiderPrototype.$queue.addPullEventListener(async (instanceId) => {
        await spiderPrototype.__allInstance__[instanceId].lunch()
      });
    }
  }
}

module.exports = initCacheAndQueue
