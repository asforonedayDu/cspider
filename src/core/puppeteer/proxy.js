const proxyChain = require('proxy-chain')

async function setProxy(oldProxyUrl, lunchOptions) {
  const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);
  lunchOptions.args.push(`--proxy-server=${newProxyUrl}`)
}

module.exports = setProxy
