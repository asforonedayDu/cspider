// const path = require('path')
const CSpider = require('../../core/index')
var outerName = 'test'


class Demo extends CSpider {
  constructor(url = '') {
    super();
    this.url = url
  }

  beforeOpenPage() {
    this.waitFor = ''
    // this.viewPort = {}
    // const domain = '.baidu.com'
    // this.cookies = [{
    //   name: 'uname',
    //   value: 'asforoneday',
    //   domain
    // }, {
    //   name: 'token',
    //   value: '1231456',
    //   domain
    // }]
    // this.userAgent = 'Mozilla/5.0 (X11; U; Linux x86_64; zh-CN; rv:1.9.2.10) Gecko/20100922 Ubuntu/10.10 (maverick) Firefox/3.6.10'
    this.customKey = 'customValue'
    // this.extraHeaders = {
    //   'SOME_HEADER_TO_SET': 'VALUE',
    //   'SOME_HEADER_TO_SET2': 'VALUE'
    // }
    // this.showConsole = 1
    this.state = {
      time: new Date().getTime(),
      customKey: 'customValue'
    }
    console.log(this.url)
  }

  pageEvents() {
    return {
      request: (request) => {
        // interceptedRequest.continue()
        // return;
        if (request.resourceType() === 'image') {
          return request.abort();
        }
        if (this.domcontentloaded) {
          return request.abort();
        }
        request.continue()
      },
    }
  }

  //
  // consoleHandler(msg) {
  //   console.log('msg:', msg)
  // }

  exposeFunction() {
    return {
      getOuterValue(attr) {
        return this.customKey + attr
      },
      updateState(newState) {
        for (let key in newState) {
          this.state[key] = newState[key]
        }
      },
      saveListData(data) {
        this.data = data
        // 处理获取到的数据
      }
    }
  }

  pageMethods() {
    return {
      runInPage: async function (select) {
        await this.updateState({
          customKey: 'newCustomValue'
        })
        const arrayData = $.map($('.title-content-title'), node => node.textContent)
        this.saveListData(arrayData)
      },
      getBody: function (select) {
        return $(`${select}`)
      },
      getValue: function () {
        // debugger
        return this.content.type
      },
      getNodeVar: function (key) {
        this.customKey = 'pageCustomValue'
        return this[key]
      },
    }
  }

  async onDomcontentloaded(html) {
    const args = arguments
    this.domcontentloaded = true
    this.state.content = {name: 'demoName'}
    this.state.content.type = {name: 'type'}
    this.state.content.type.name = 'typeName'
    let dd = await this.getValue()
    this.state.content.type.value = 'new TypeName'
    dd = await this.getValue()
    // setTimeout(async () => {
    //   dd = await this.getValue()
    // }, 5000)
    // await this.onIdle()
    // await this.$closePage()
    if (this.priority === 1) {
      await this.$closeBrowser()
    }
  }

  async onLoaded() {
    // this.state.person = {name: 'zhangsan'}
    // console.log('new key person: ', await this.getNodeVar('person'))
    // this.state.person.name = 'lisi'
    // console.log('new key person: ', await this.getNodeVar('person'))
    // if (this.priority === 1) {
    //   new Demo('https://www.baidu.com?priority=10').enQueue({priority: 10})
    //   new Demo('https://www.baidu.com?priority=20').enQueue({priority: 20})
    // }
  }

  beforeDestroy() {
    const args = arguments
    console.log('beforeDestroy')
  }
}

CSpider.setMaxConcurrency(11)

// CSpider.setProxy('http://localhost:8080/')

CSpider.onBeforeLunch(function (Puppeteer) {
  return {
    // headless: false,
    devtools: true,
  }
})

// newDemo('https://haokan.baidu.com/v?vid=9914676384113537463&pd=bjh&fr=bjhauthor&type=video').enQueue()
const demo = new Demo()
demo.url = 'https://www.baidu.com'
demo.enQueue()
