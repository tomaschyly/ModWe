/**
 * Current enabled state.
 * @type {boolean}
 */
let enabled = false;

/**
 * Configured search URL prefixes.
 * @type {Array<string>}
 */
let searchUrls = [];

/**
 * Initialize popup.
 */
function initPopup() {
	document.getElementById('options').addEventListener('click', openOptions);
	document.getElementById('toggle-enabled').addEventListener('click', toggleEnabled);
	document.getElementById('navigate').addEventListener('change', navigate);
	document.getElementById('search-source').addEventListener('change', onSearchSourceChange);
	document.getElementById('search-form').addEventListener('submit', submitSearch);
	document.getElementById('open-urls').addEventListener('keyup', openUrls);

	setTimeout(() => {
		requestConfig('enabled');
		requestConfig('pages');
		requestGeneralConfig();
	}, 1);

	addRuntimeMessageListener(onRuntimeMessage);
}

/**
 * Persist selected search URL as last used value.
 */
function onSearchSourceChange() {
	const searchSource = document.getElementById('search-source').value;
	rememberLastSearchSource(searchSource);
}

/**
 * Handle search form submit from button click or Enter key.
 * @param {Event} e Submit event.
 */
function submitSearch(e) {
	e.preventDefault();
	search();
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
 * Normalize search URL list by trimming values and removing empty items.
 * @param {Array|*} value Raw search URL list.
 * @returns {Array<string>}
 */
function normalizeSearchUrls(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	const urls = [];
	for (let i = 0; i < value.length; i++) {
		if (typeof value [i] !== 'string') {
			continue;
		}

		const trimmed = value [i].trim();
		if (trimmed !== '') {
			urls.push(trimmed);
		}
	}

	return urls;
}

/**
 * Initialize search URL selector.
 * @param {Array<string>} urls Search URL list.
 * @param {string} searchLast Last selected search URL.
 */
function initSearchSources(urls, searchLast) {
	const searchSourceSelect = document.getElementById('search-source');

	while (searchSourceSelect.options.length > 1) {
		searchSourceSelect.remove(1);
	}

	if (urls.length === 0) {
		searchSourceSelect.querySelector('option').textContent = 'No search URLs found';
		return;
	}

	searchSourceSelect.querySelector('option').textContent = 'Search with...';
	for (let i = 0; i < urls.length; i++) {
		const option = document.createElement('option');
		option.value = urls [i];
		option.textContent = urls [i];
		searchSourceSelect.appendChild(option);
	}

	if (searchLast !== '' && urls.indexOf(searchLast) !== -1) {
		searchSourceSelect.value = searchLast;
		return;
	}

	if (urls.length === 1) {
		searchSourceSelect.value = urls [0];
	}
}

/**
 * Persist last used search URL without overwriting the search URL list.
 * @param {string} searchSource Selected search URL.
 */
function rememberLastSearchSource(searchSource) {
	if (typeof searchSource !== 'string' || searchSource === '') {
		return;
	}

	if (searchUrls.indexOf(searchSource) === -1) {
		return;
	}

	setGeneralConfig({
		search_last: searchSource
	});
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
 * Search using selected search URL.
 */
function search() {
	const query = encodeURIComponent(document.getElementById('query').value);
	const searchSource = document.getElementById('search-source').value;
	const newTab = document.getElementById('search-new').checked;

	if (searchSource === '') {
		writeMessage('<p>Set search URLs first in options and select one in popup.</p>', true);
		return;
	}

	rememberLastSearchSource(searchSource);

	const url = searchSource + query;
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
		case 'config-get-general': {
			const general = message.value && typeof message.value === 'object' ? message.value : {};
			searchUrls = normalizeSearchUrls(general.searches);
			initSearchSources(searchUrls, typeof general.search_last === 'string' ? general.search_last : '');
			break;
		}
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
