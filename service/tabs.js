/**
 * Open URL in a new tab.
 * @param {string} url Target URL.
 */
function openUrlInNewTab(url) {
	chrome.tabs.create({
		url: url
	});
}

/**
 * Open URL in active tab or callback when no active tab exists.
 * @param {string} url Target URL.
 * @param {function} onNoActiveTab Callback for no active tab.
 * @param {function} onSuccess Callback for successful open.
 */
function openUrlInActiveTab(url, onNoActiveTab, onSuccess) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, tabs => {
		if (tabs.length > 0) {
			const tab = tabs [0];

			chrome.tabs.update(tab.id, {
				url: url
			});

			if (typeof onSuccess === 'function') {
				onSuccess();
			}

			return;
		}

		if (typeof onNoActiveTab === 'function') {
			onNoActiveTab();
		}
	});
}

/**
 * Open URL either in a new tab or active tab.
 * @param {string} url Target URL.
 * @param {boolean} useNewTab Whether to open a new tab.
 * @param {function} onNoActiveTab Callback for no active tab.
 * @param {function} onSuccess Callback for successful open.
 */
function openUrl(url, useNewTab, onNoActiveTab, onSuccess) {
	if (useNewTab) {
		openUrlInNewTab(url);

		if (typeof onSuccess === 'function') {
			onSuccess();
		}

		return;
	}

	openUrlInActiveTab(url, onNoActiveTab, onSuccess);
}
