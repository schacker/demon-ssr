/**
 *  简单基于koa，middleware
 /* @author huangwei
 */

 const assert = require('assert')
 const pathToReg = require('path-to-regexp')
 
 const handler = (options = {}) => {
   return async (ctx, next) => {
     const {
       ssr,
       map,
       payload
     } = options
 
     assert(ssr, 'ssr instance is required!')
 
     const injected = Object.assign({}, { ctx }, payload || {})
     
     let renderedPath;
 
     if (map) {
       Object.keys(map).forEach(path => {
         const re = pathToReg.pathToRegexp(path)
        //  查路由path匹配map中的path
         if (ctx.path.match(re)) {
           renderedPath = path
         }
       })
 
       if (renderedPath) {
        // 调用ssr实例渲染接口
        const rendered = await ssr.render(renderedPath, injected, ctx)
         ctx.body = rendered.body
       } else {
         await next()
       }
     }
   }
 }
 
 module.exports = handler