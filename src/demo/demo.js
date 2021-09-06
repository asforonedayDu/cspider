const {CSpider} = require('../../index')

class Demo extends CSpider {
  constructor(url = '') {
    super();
    this.url = url
  }

  pageEvents() {
    return {
      request: (request) => {
        // interceptedRequest.continue()
        // return;
        if (request.resourceType() === 'image') {
          // return request.abort();
        }
        // if (request.resourceType() === 'script') {
        //     return request.abort();
        // }
        // if (this.domcontentloaded) {
        //     return request.abort();
        // }
        request.continue()
      },
    }
  }

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

  beforeOpenPage() {
    const domain = '.douban.com'
    let cookies = `_vwo_uuid_v2=D4B56A0FE4AFC86A2D143914F387F9D3B|ffbce5c3457a2a9f8a2f19a7c6a995ab; gr_user_id=085d9981-8a8d-4887-b19f-6291151351b5; ll="118283"; bid=0vi85WgnIr4; __utmc=30149280; _pk_ses.100001.8cb4=*; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1630869513%2C%22https%3A%2F%2Faccounts.douban.com%2F%22%5D; __utma=30149280.457743187.1582375470.1630863873.1630869514.34; __utmz=30149280.1630869514.34.5.utmcsr=accounts.douban.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmt=1; dbcl2="146785247:3m1IQpZdc78"; ck=sqg5; push_noty_num=0; push_doumail_num=0; __utmv=30149280.14678; _pk_id.100001.8cb4=7801c0db729c64be.1588225280.7.1630869572.1630864505.; __utmb=30149280.5.10.1630869514`
    cookies = cookies.split('; ')
    cookies = cookies.map(item => {
      const index = item.indexOf('=')
      if (index < 0) return null
      return {
        name: item.substring(0, index),
        value: item.substring(index + 1),
        domain,
      }
    }).filter(e => e)
    this.cookies = cookies
  }

  pageMethods() {
    return {
      runInPage: async function (select) {
        $('.global-nav-items a').eq(2)[0].click()
      },
    }
  }

  onRedirect(newUrl, oldUrl) {
    console.log('网页重定向到了：', newUrl, '原地址：', oldUrl)
  }

  async onCreateNewPage(page) {
    if (/movie\.douban/i.test(page.url())) {
      console.log('获取到了新网页，并使用DianYing类处理：', page.url())
      new DianYing().$catchPage(page)
      await this.$closePage()
    }
  }

  async onDomcontentloaded(html) {
    console.log('模拟点击豆瓣电影')
    await this.runInPage()
  }
}

class DianYing extends CSpider {
  constructor(url = '') {
    super();
    this.url = url
  }

  pageMethods() {
    return {
      runInPage: async function (select) {
        return $('.ui-slide-item').eq(0).data('title')
      },
    }
  }

  async onDomcontentloaded(html) {
    const data = await this.runInPage()
    console.log('豆瓣电影页加载完成 首位电影：', data)
    await this.$closeBrowser()
  }
}
CSpider.onBeforeLunch(function (Puppeteer) {
  return {
    // headless: false,
    devtools: true,
  }
})
new Demo('http://www.douban.com/').enQueue()

