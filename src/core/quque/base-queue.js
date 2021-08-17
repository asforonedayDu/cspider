const AsyncEventEmitter = require('../libs/async-events');


/**
 * @interface
 */
class BaseQueue extends AsyncEventEmitter {
  /**
   * @param {!Object=} settings
   */
  constructor(settings) {
    super()
    this._settings = settings || {};
    this._resolveIdle = undefined;
  }

  /**
   * @param {!string} target
   * @param {!number=} priority
   * @return {!Promise}
   */
  enqueue(target, {priority} = {}) {
    throw new Error('Enqueue is not overridden!');
  }

  /**
   * @return {!Promise}
   */
  onIdle() {
    throw new Error('onIdle is not overridden!');
  }

  /**
   * 页面关闭时通知更改队列数量
   */
  onPageClosed() {
    throw new Error('onPageClosed is not overridden!');
  }

  /**
   *
   */
  addPullEventListener() {
    throw new Error('addPullEventListener is not overridden!');
  }
}

module.exports = BaseQueue;
