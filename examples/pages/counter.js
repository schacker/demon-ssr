import React, { useState } from 'react'

const Counter = (props) => {
  const [count, setCount] = useState(props.count);

  const incr = () => {
    setCount(count+1)
  }

  const decr = () => {
    setCount(count-1)
  }
    return (
      <section>
        <h2>Hot Reload Counter</h2>
        <h2>{count}</h2>
        <button onClick={incr}>+</button>
        <button onClick={decr}>-</button>
      </section>
    )
}
Counter.getInitialProps = async function(data) {
  return {
    count: data.count
  }
}
export default Counter