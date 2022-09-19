import React from 'react'
import serialize from 'serialize-javascript'

export default ({
  pageStyles,
  pageScripts,
  initialProps = {},
  dev,
  publicPath,
  body,
  inlineCSSString,
  helmet
}) => {

  const scripts = [...pageScripts]
  
  const main = scripts.pop()
  const vendors = scripts.pop()
  const otherScripts = scripts

  return (
    <html {...helmet.htmlAttributes.toComponent()}>
      <head>
        {helmet.title.toComponent()}
        {helmet.meta.toComponent()}
        {helmet.noscript.toComponent()}
        {helmet.style.toComponent()}
        {helmet.link.toComponent()}
        {inlineCSSString ? inlineCSSString.map(str => {
          return <style key={str.slice(0, 8)} dangerouslySetInnerHTML={{__html: str}}></style>
        }) : pageStyles.map(url => {
          return <link key={url} rel='stylesheet' href={publicPath + url} />
        })}
        <script dangerouslySetInnerHTML={{
          __html: `
            window.__SSR__DEV = ${dev};
            window.__SSR__DATA = {};
            window.__SSR__DATA.pageInitialProps = ${serialize(initialProps)};
          `
        }}>
        </script>
        {helmet.script.toComponent()}
      </head>
      <body {...helmet.bodyAttributes.toComponent()}>
        <div id="app" dangerouslySetInnerHTML={{ __html: body }} />
        
        { <script crossOrigin="anonymous" src={publicPath + vendors}></script>}
        {otherScripts.map(script => {
          return <script crossOrigin="anonymous" key={script} src={publicPath + script}></script>
        })}
        { <script crossOrigin="anonymous" src={publicPath + main}></script>}
      </body>
    </html>
  )
}