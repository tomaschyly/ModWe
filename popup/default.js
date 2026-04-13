/**
 * Current enabled state.
 * @type {boolean}
 */
let enabled = false;

/**
 * Configured search URL prefix.
 * @type {string|undefined}
 */
let searchUrl = undefined;

/**
 * Initialize popup.
 */
function initPopup() {
	document.getElementById('options').addEventListener('click', openOptions);
	document.getElementById('toggle-enabled').addEventListener('click', toggleEnabled);
	document.getElementById('navigate').addEventListener('change', navigate);
	document.getElementById('search').addEventListener('click', search);
	document.getElementById('open-urls').addEventListener('keyup', openUrls);

	setTimeout(() => {
		requestConfig('enabled');
		requestConfig('pages');
		requestGeneralConfig();
	}, 1);

	addRuntimeMessageListener(onRuntimeMessage);
}

/**
 * Initialize page navigation dropdown.
 * @param {Array} pages Configured pages.
 */
function initNavigation(pages) {
	const navigateSelect = document.getElementById('navigate');

	if (pages.length > 0) {
		for (let i = 0; i < pages.length; i++) {
			const option = document.createElement('option');
			option.value = pages [i].url;
			option.textContent = pages [i].name;

			navigateSelect.appendChild(option);
		}
		return;
	}

	navigateSelect.querySelector('option').textContent = 'No pages found';
}

/**
 * Navigate to selected page URL.
 */
function navigate() {
	const url = document.getElementById('navigate').value;
	const newTab = document.getElementById('navigate-new').checked;

	if (url === '') {
		writeMessage('<p>Selected page has no url associated.</p>', true);
		return;
	}

	openUrl(url, newTab, () => {
		writeMessage('<p>You have no tab active.</p>', true);
	}, () => {
		window.close();
	});
}

/**
 * Search using configured search URL.
 */
function search() {
	const query = encodeURIComponent(document.getElementById('query').value);
	const newTab = document.getElementById('navigate-new').checked;

	if (!searchUrl) {
		writeMessage('<p>Set search url first in options.</p>', true);
		return;
	}

	const url = searchUrl + query;
	openUrl(url, newTab, () => {
		writeMessage('<p>You have no tab active.</p>', true);
	}, () => {
		window.close();
	});
}

/**
 * Open URLs from textarea, one URL per line.
 */
function openUrls() {
	const urls = document.getElementById('open-urls').value;

	if (urls.trim() !== '') {
		let atLeastOne = false;
		const urlsSplit = urls.trim().split('\n');

		for (const url of urlsSplit) {
			if (url !== '') {
				openUrlInNewTab(url);
				atLeastOne = true;
			}
		}

		if (atLeastOne) {
			window.close();
		}
	}
}

/**
 * Render informational message.
 * @param {string} content Message HTML content.
 * @param {boolean} isError Whether message is error.
 */
function writeMessage(content, isError) {
	const container = document.getElementById('message');

	container.classList.remove('error');
	if (isError) {
		container.classList.add('error');
	}

	container.innerHTML = content;
}

/**
 * Handle runtime messages from background.
 * @param {Object} message Runtime message.
 */
function onRuntimeMessage(message) {
	if (typeof message.type === 'undefined') {
		return;
	}

	switch (message.type) {
		case 'config-get':
			if (message.key === 'enabled' && message.value !== null) {
				enabled = message.value === 1;

				if (enabled) {
					toggleEnabled(true);
				}
			} else if (message.key === 'pages') {
				const pages = message.value !== null ? message.value : [];
				initNavigation(pages);
			}
			break;
		case 'config-get-general':
			searchUrl = message.value.search || undefined;
			break;
		default:
			throw Error('Unsupported message (' + message.type + ') by popup script');
	}
}

/**
 * Open extension options and close popup.
 */
function openOptions() {
	chrome.runtime.openOptionsPage();
	window.close();
}

/**
 * Toggle enabled state and persist it.
 * @param {boolean|undefined} newState Optional explicit enabled state.
 */
function toggleEnabled(newState) {
	enabled = typeof newState === 'boolean' ? newState : !enabled;

	const button = document.getElementById('toggle-enabled');
	if (enabled) {
		button.classList.add('enabled');
		button.textContent = 'Enabled';
	} else {
		button.classList.remove('enabled');
		button.textContent = 'Disabled';
	}

	setConfigValue('enabled', enabled ? 1 : 0);
}

initPopup();
