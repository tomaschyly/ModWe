/**
 * Local cache for values from chrome.storage.
 * @type {Object}
 */
const configData = {};

/**
 * Background initialization.
 */
async function initBackground() {
	await initConfig();
	initContentScripts();
	addRuntimeMessageListener(onRuntimeMessage);
	initPageActionRules();
}

/**
 * Load configuration from extension storage.
 * @returns {Promise<void>}
 */
function initConfig() {
	return new Promise(resolve => {
		chrome.storage.local.get(['enabled', 'pages', 'page_settings', 'general'], response => {
			Object.assign(configData, response || {});
			resolve();
		});
	});
}

/**
 * Read one value from cached config.
 * @param {string} key Config key.
 * @returns {*}
 */
function getConfig(key) {
	if (typeof configData [key] !== 'undefined') {
		return configData [key];
	}

	return null;
}

/**
 * Read full cached config.
 * @returns {Object}
 */
function getAllConfig() {
	return configData;
}

/**
 * Write one config value and persist.
 * @param {string} key Config key.
 * @param {*} value Config value.
 */
function setConfig(key, value) {
	configData [key] = value;
	chrome.storage.local.set(configData);
}

/**
 * Replace config values and persist.
 * @param {Object} data New config object.
 */
function setAllConfig(data) {
	const newData = data && typeof data === 'object' ? data : {};

	Object.keys(configData).forEach(key => {
		delete configData [key];
	});
	Object.assign(configData, newData);

	chrome.storage.local.set(configData);
}

/**
 * Register content script injection listener.
 */
function initContentScripts() {
	if (!chrome.tabs.onUpdated.hasListener(onTabUpdate)) {
		chrome.tabs.onUpdated.addListener(onTabUpdate);
	}
}

/**
 * Handle updated tabs and execute page-specific CSS/JS.
 * @param {number} tabId Updated tab id.
 * @param {Object} changeInfo Tab update info.
 * @param {Object} tab Updated tab.
 */
function onTabUpdate(tabId, changeInfo, tab) {
	if (changeInfo.status !== 'complete' || getConfig('enabled') !== 1) {
		return;
	}

	const pages = Array.isArray(getConfig('pages')) ? getConfig('pages') : [];
	if (pages.length === 0) {
		return;
	}

	const url = typeof tab.url === 'string' ? tab.url : '';

	for (let i = 0; i < pages.length; i++) {
		const page = pages [i];
		if (typeof page.regexp !== 'string' || page.regexp === '') {
			continue;
		}

		const regexp = createRegExp(page.regexp);
		if (regexp === null) {
			continue;
		}

		if (regexp.test(url)) {
			applyPageSettings(tabId, getPageSettings(page.id));
			break;
		}
	}
}

/**
 * Create RegExp from stored pattern.
 * @param {string} pattern String pattern from config.
 * @returns {null|RegExp}
 */
function createRegExp(pattern) {
	try {
		return new RegExp(pattern);
	} catch (error) {
		return null;
	}
}

/**
 * Get page settings by page id.
 * @param {string|number} id Page identifier.
 * @returns {null|Object}
 */
function getPageSettings(id) {
	const settings = getConfig('page_settings');
	if (settings === null || typeof settings !== 'object') {
		return null;
	}

	return typeof settings [id] !== 'undefined' ? settings [id] : null;
}

/**
 * Apply CSS and JS settings for one tab.
 * @param {number} tabId Target tab id.
 * @param {Object|null} settings Page settings.
 */
function applyPageSettings(tabId, settings) {
	if (settings === null || typeof settings !== 'object') {
		return;
	}

	if (typeof settings.css === 'string' && settings.css !== '') {
		chrome.tabs.insertCSS(tabId, {
			code: settings.css
		});
	}

	if (typeof settings.js === 'string' && settings.js !== '') {
		chrome.tabs.executeScript(tabId, {
			code: settings.js
		});
	}
}

/**
 * Parse general settings JSON from config.
 * @param {*} value Stored value.
 * @returns {Object}
 */
function parseGeneralConfig(value) {
	if (typeof value !== 'string' || value === '') {
		return {};
	}

	try {
		return JSON.parse(value);
	} catch (error) {
		return {};
	}
}

/**
 * Handle incoming runtime messages.
 * @param {Object} message Runtime message.
 */
function onRuntimeMessage(message) {
	if (!message || typeof message.type === 'undefined') {
		return;
	}

	switch (message.type) {
		case 'config-get':
			sendRuntimeMessage({
				type: 'config-get',
				key: message.key,
				value: getConfig(message.key),
				identificator: message.identificator
			});
			break;
		case 'config-get-all':
			sendRuntimeMessage({
				type: 'config-get-all',
				data: getAllConfig()
			});
			break;
		case 'config-set':
			setConfig(message.key, message.value);
			sendRuntimeMessage({
				type: 'config-set-done',
				key: message.key
			});
			break;
		case 'config-set-all':
			setAllConfig(message.data);
			sendRuntimeMessage({
				type: 'config-set-all-done'
			});
			break;
		case 'config-get-general':
			sendRuntimeMessage({
				type: 'config-get-general',
				value: parseGeneralConfig(getConfig('general'))
			});
			break;
		case 'config-set-general':
			setConfig('general', JSON.stringify(message.value || {}));
			sendRuntimeMessage({
				type: 'config-set-general-done'
			});
			break;
		default:
			throw Error('Unsupported message (' + message.type + ') by background script');
	}
}

/**
 * Configure page action rules.
 */
function initPageActionRules() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
		chrome.declarativeContent.onPageChanged.addRules([
			{
				conditions: [new chrome.declarativeContent.PageStateMatcher({})],
				actions: [new chrome.declarativeContent.ShowPageAction()]
			}
		]);
	});
}

initBackground();
