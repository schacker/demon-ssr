import React from 'react'

// 取出页面组件
const Component = window.__ssr.default

const App = () => {
  return <Component {...window.__SSR__DATA.pageInitialProps} />
}

export default App
