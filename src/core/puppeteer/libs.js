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

async function setBrowserPage(page) {
    // 设置webdriver
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false});
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                {
                    0: {
                        type: "application/x-google-chrome-pdf",
                        suffixes: "pdf",
                        description: "Portable Document Format",
                        enabledPlugin: Plugin
                    },
                    description: "Portable Document Format",
                    filename: "internal-pdf-viewer",
                    length: 1,
                    name: "Chrome PDF Plugin"
                },
                {
                    0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
                    description: "",
                    filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                    length: 1,
                    name: "Chrome PDF Viewer"
                },
                {
                    0: {
                        type: "application/x-nacl",
                        suffixes: "",
                        description: "Native Client Executable",
                        enabledPlugin: Plugin
                    },
                    1: {
                        type: "application/x-pnacl",
                        suffixes: "",
                        description: "Portable Native Client Executable",
                        enabledPlugin: Plugin
                    },
                    description: "",
                    filename: "internal-nacl-plugin",
                    length: 2,
                    name: "Native Client"
                }
            ],
        });
    });
    await page.evaluateOnNewDocument(() => {
        window.navigator.chrome = {
            runtime: {},
            loadTimes: function () {
            },
            csi: function () {
            },
            app: {}
        };
    });
    await page.evaluateOnNewDocument(() => {
        window.navigator.language = {
            runtime: {},
            loadTimes: function () {
            },
            csi: function () {
            },
            app: {}
        };
    });
}

module.exports = {
    deepProxy,
    setBrowserPage,
}
