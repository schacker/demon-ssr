import React from 'react'
import { hydrate } from 'react-dom'

import App from './App'

if (window.__ssr) {
  hydrate(<App />, document.querySelector('#app'))
}

export default App
