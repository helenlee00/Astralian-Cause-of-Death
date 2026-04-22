/**
 * js/events.js
 *
 * Lightweight publish/subscribe event bus for cross-chart communication.
 *
 * Used to synchronise interactions across independent chart modules —
 * hovering a cause in one chart highlights it in all others without
 * creating tight coupling between modules.
 *
 * Events emitted in this project:
 *   'highlight'   — { cause: string|null }   hover on/off a cause
 *   'yearChange'  — { year: number }          bar race year changed
 *
 * Usage:
 *   EventBus.on('highlight', ({ cause }) => { ... });
 *   EventBus.emit('highlight', { cause: 'Neoplasms' });
 *   EventBus.emit('highlight', { cause: null });  // clear
 */

const EventBus = {
  _listeners: {},

  /**
   * Register a callback for an event.
   * @param {string}   event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  /**
   * Remove a specific callback for an event.
   * @param {string}   event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  /**
   * Emit an event, calling all registered callbacks with data.
   * @param {string} event
   * @param {*}      data
   */
  emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  },
};
