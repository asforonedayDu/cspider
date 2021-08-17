const EventEmitter = require('events');
const initPuppeteer = require('../puppeteer/init')
const initLifeCycle = require('./initLifeCycle')
const initCacheAndQueue = require('./initQueue')


class SpiderWrapper extends EventEmitter {

}

class Spider extends SpiderWrapper {
  constructor() {
    super();
    this.initInstance()
  }


  enQueue(option = {priority: 1}) {
    if (!this.url) {
      throw new Error('incorrect argument, url is required.')
    }
    const reg = /^(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/;
    if (!reg.test(this.url)) {
      throw new Error('incorrect url: ' + this.url)
    }
    this.priority = option.priority
    return this.$queue.enqueue(this.id, option);
  }
}

Spider.name = 'spider'


initCacheAndQueue(Spider)
initLifeCycle(Spider)
initPuppeteer(Spider)

module.exports = Spider
