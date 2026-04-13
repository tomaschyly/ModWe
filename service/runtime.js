/**
 * Send a runtime message using Chrome extension API.
 * @param {Object} message Message payload to send.
 */
function sendRuntimeMessage(message) {
	chrome.runtime.sendMessage(message);
}

/**
 * Register a runtime message listener.
 * @param {function} listener Runtime message listener.
 */
function addRuntimeMessageListener(listener) {
	chrome.runtime.onMessage.addListener(listener);
}
