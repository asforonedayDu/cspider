function deepProxy(obj, cb, parents = []) {

  if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        obj[key] = deepProxy(obj[key], cb, parents.concat([key]));
      }
    })
  }

  return new Proxy(obj, {
    /**
     * @param {Object, Array} target 设置值的对象
     * @param {String} key 属性
     * @param {any} value 值
     * @param {Object} receiver this
     */
    set: async function (target, key, value, receiver) {

      if (typeof value === 'object') {
        value = deepProxy(value, cb, parents.concat([key]));
      }

      let cbType = target[key] === undefined ? 'create' : 'modify';

      Reflect.set(target, key, value, receiver);
      //排除数组修改length回调
      if (!(Array.isArray(target) && key === 'length')) {
        await cb(cbType, {target, key, value, parents});
      }
      return true
    },
    deleteProperty(target, key) {
      cb('delete', {target, key, parents});
      return Reflect.deleteProperty(target, key);
    }

  });
}

async function waitAsyncQueue() {

}

module.exports = {
  deepProxy
}
