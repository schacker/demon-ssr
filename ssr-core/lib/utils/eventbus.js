export default class EventBus {

  handlers = {};

  on (eventName, fn) {
    this.handlers[eventName] = this.handlers[eventName] || []
    this.handlers[eventName].push(fn)
  }

  emit (eventName, payload) {
    if (this.handlers[eventName]) {
      this.handlers[eventName].forEach(fn => {
        fn(payload)
      })
    }
  }
}