const noop = require('lodash/noop');
const BaseQueue = require('./base-queue');
const {lowerBound} = require('../libs/helper');

const INTERVAL = 200;
let _maxConcurrency = Infinity
const _storage = []

class PriorityQueue extends BaseQueue {
  /**
   * @param {!Object} options
   */
  constructor(options) {
    super();
    _maxConcurrency = options.maxConcurrency || Infinity;
    this._isPaused = false;
    this._pendingCount = 0;
    this._resolveIdle = noop;
  }

  /**
   * @return {!Array}
   * @override
   */
  get() {
    return _storage;
  }

  addPullEventListener(listener) {
    this.on('pull', function () {
      listener(...arguments)
    })
  }

  /**
   * @param {...*}
   * @param target
   * @param priority
   * @param key
   */
  enqueue(target, {priority = 1} = {priority: 1}) {
    if (!target) return
    const queue = _storage
    const item = {data: target, priority};
    if (queue.length && queue[queue.length - 1].priority >= priority) {
      queue.push(item);
    } else {
      const index = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      queue.splice(index, 0, item);
      this._watch()
    }
    return true;
  }

  /**
   * @private
   * 一次取出队列剩余长度数量 队列为空或没有新任务时返回 true
   */
  dequeue() {
    if (this._isPaused) return false;
    if (this._pendingCount >= _maxConcurrency) return false;
    this._pendingCount += 1;

    const item = _storage.shift();
    if (!item) {
      this._pendingCount -= 1;
    } else {
      this.emitAsync('pull', item.data).then();
    }
    // 队列为空以及页面全部关闭
    if (this._pendingCount === 0) {
      this._unwatch();
      this._resolveIdle()
      this.idlePromise = undefined
    }
    return item ? this.dequeue() : false;
  }

  pause() {
    this._isPaused = true;
    this._unwatch();
  }

  setMaxConcurrency(maxConcurrency) {
    _maxConcurrency = maxConcurrency;
  }

  resume() {
    if (!this._isPaused) return;
    this._isPaused = false;
    this.dequeue();
  }

  /**
   * @return {!boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * @return {!number}
   */
  pending() {
    return this._pendingCount;
  }

  /**
   *
   */
  onPageClosed() {
    this._pendingCount -= 1;
    this.dequeue();
  }

  /**
   * @return {number}
   */
  size() {
    const queue = _storage
    return queue ? queue.length : 0;
  }

  /**
   * @return {!Promise}
   */
  onIdle() {
    if (this._pendingCount === 0) {
      return Promise.resolve(true);
    }
    if (!this.idlePromise) {
      this.idlePromise = new Promise(resolve => {
        this._resolveIdle = resolve;
      });
    }

    return this.idlePromise
  }

  /**
   * @private
   */
  _watch() {
    this._unwatch();
    this._interval = setInterval(async () => {
      await this.dequeue()
    }, INTERVAL);
  }

  /**
   * @return {!Boolean}
   * @override
   */
  clear() {
    _storage.length = 0;
    return true;
  }

  /**
   * @private
   */
  _unwatch() {
    clearInterval(this._interval);
  }

  /**
   * @param {!string} target
   * @return {!Boolean}
   * @override
   */
  remove(target) {
    const index = _storage.indexOf(target)
    if (index === -1) return false
    _storage.splice(index, 1);
    return true;
  }
}

// tracePublicAPI(PriorityQueue);

module.exports = PriorityQueue;
