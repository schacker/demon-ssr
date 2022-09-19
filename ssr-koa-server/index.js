/**
 *  简单基于koa，搭建服务器
 /* @author huangwei
 */

const Koa = require('koa')
const {Ssr} = require('../ssr-core/dist')
const ssr_middleware = require('./service/ssr.middleware')
const path = require('path')
const glob = require('glob')

class Server {

  constructor(options) {

    const app = new Koa()

    const ssr = new Ssr(options)
    const port = 3001

    const {
      baseDir
    } = options

    const map = {}

    glob.sync('**/*.*', {
      cwd: path.resolve(baseDir, './pages')
    }).map(filename => filename.split('.')[0]).forEach(page => {
      map['/' + page] = page
    })

    const payload = {foo: "ceshi", count: 10, list: [{"gender":"male","name":{"title":"Mr","first":"Alexander","last":"Singh"},"email":"alexander.singh@example.com","picture":{"large":"https://randomuser.me/api/portraits/men/49.jpg","medium":"https://randomuser.me/api/portraits/med/men/49.jpg","thumbnail":"https://randomuser.me/api/portraits/thumb/men/49.jpg"},"nat":"NZ"},{"gender":"female","name":{"title":"Ms","first":"Nathalie","last":"De Schipper"},"email":"nathalie.deschipper@example.com","picture":{"large":"https://randomuser.me/api/portraits/women/60.jpg","medium":"https://randomuser.me/api/portraits/med/women/60.jpg","thumbnail":"https://randomuser.me/api/portraits/thumb/women/60.jpg"},"nat":"NL"},{"gender":"female","name":{"title":"Mrs","first":"Lolita","last":"Redko"},"email":"lolita.redko@example.com","picture":{"large":"https://randomuser.me/api/portraits/women/1.jpg","medium":"https://randomuser.me/api/portraits/med/women/1.jpg","thumbnail":"https://randomuser.me/api/portraits/thumb/women/1.jpg"},"nat":"UA"}]}

    app.use(ssr_middleware({
      ssr,
      map,
      payload
    }))

    this.ssr = ssr
    this.app = app

    ssr.prepare().then(() => {
      app.listen(port, () => {
        console.log('Running at http://localhost:' + port)
      })
    })
  }
}
new Server({
  baseDir: path.resolve(process.cwd(), './examples'),
  // NoSSR: true
});

// export default Server
