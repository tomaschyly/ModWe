importScripts('service/runtime.js');

/**
 * Local cache for values from chrome.storage.
 * @type {Object}
 */
const configData = {};

/**
 * Keys used by extension config.
 * @type {Array<string>}
 */
const configKeys = ['enabled', 'pages', 'page_settings', 'general'];

/**
 * Promise used to avoid duplicate storage loads.
 * @type {Promise<void>|null}
 */
let configLoadPromise = null;

/**
 * Cached runtime availability of userScripts API.
 * @type {boolean|null}
 */
let userScriptsEnabled = null;

/**
 * Ensure user-scripts warning is logged only once.
 * @type {boolean}
 */
let userScriptsWarningLogged = false;

/**
 * Register background listeners and start async init.
 */
function initBackground() {
	addRuntimeMessageListener(onRuntimeMessage);

	if (!chrome.tabs.onUpdated.hasListener(onTabUpdate)) {
		chrome.tabs.onUpdated.addListener(onTabUpdate);
	}

	initPageActionRules();
	ensureConfigLoaded();
}

/**
 * Compare two string arrays for equality.
 * @param {Array<string>} left First array.
 * @param {Array<string>} right Second array.
 * @returns {boolean}
 */
function areStringArraysEqual(left, right) {
	if (left.length !== right.length) {
		return false;
	}

	for (let i = 0; i < left.length; i++) {
		if (left [i] !== right [i]) {
			return false;
		}
	}

	return true;
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
 * Normalize last selected search URL value.
 * @param {*} value Raw last selected search URL.
 * @returns {string}
 */
function normalizeSearchLast(value) {
	if (typeof value !== 'string') {
		return '';
	}

	const trimmed = value.trim();
	return trimmed !== '' ? trimmed : '';
}

/**
 * Normalize general settings object to current schema.
 * @param {*} value Raw general settings.
 * @returns {Object}
 */
function normalizeGeneralConfig(value) {
	const parsed = parseGeneralConfig(value);
	const searches = normalizeSearchUrls(parsed.searches);
	let searchLast = normalizeSearchLast(parsed.search_last);

	if (searches.indexOf(searchLast) === -1) {
		searchLast = '';
	}

	return {
		searches: searches,
		searches_migrated: parsed.searches_migrated === 1 || parsed.searches_migrated === true ? 1 : 0,
		search_last: searchLast
	};
}

/**
 * Migrate general settings from legacy schema.
 * @param {*} value Raw general settings.
 * @returns {{value: Object, changed: boolean}}
 */
function migrateGeneralConfig(value) {
	const parsed = parseGeneralConfig(value);
	const normalized = normalizeGeneralConfig(parsed);

	let searches = normalized.searches.slice();
	if (normalized.searches_migrated !== 1 && searches.length === 0 && typeof parsed.search === 'string') {
		const legacySearch = parsed.search.trim();
		if (legacySearch !== '') {
			searches = [legacySearch];
		}
	}

	const searchLast = searches.indexOf(normalized.search_last) !== -1
		? normalized.search_last
		: (searches.length === 1 ? searches [0] : '');

	const migrated = {
		searches: searches,
		searches_migrated: 1,
		search_last: searchLast
	};

	return {
		value: migrated,
		changed: normalized.searches_migrated !== migrated.searches_migrated
			|| !areStringArraysEqual(normalized.searches, migrated.searches)
			|| normalized.search_last !== migrated.search_last
			|| typeof parsed.search !== 'undefined'
			|| typeof value !== 'string'
	};
}

/**
 * Ensure cached general settings are migrated and serialized.
 * @returns {boolean}
 */
function ensureGeneralConfigMigrated() {
	const migration = migrateGeneralConfig(configData.general);
	if (!migration.changed) {
		return false;
	}

	configData.general = JSON.stringify(migration.value);
	return true;
}

/**
 * Ensure config cache is loaded before read operations.
 * @returns {Promise<void>}
 */
function ensureConfigLoaded() {
	if (configLoadPromise !== null) {
		return configLoadPromise;
	}

	configLoadPromise = new Promise(resolve => {
		chrome.storage.local.get(configKeys, response => {
			Object.assign(configData, response || {});

			if (ensureGeneralConfigMigrated()) {
				chrome.storage.local.set(configData);
			}

			resolve();
		});
	});

	return configLoadPromise;
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
	ensureGeneralConfigMigrated();

	chrome.storage.local.set(configData);
}

/**
 * Handle updated tabs and execute page-specific CSS/JS.
 * @param {number} tabId Updated tab id.
 * @param {Object} changeInfo Tab update info.
 * @param {Object} tab Updated tab.
 */
function onTabUpdate(tabId, changeInfo, tab) {
	if (changeInfo.status !== 'complete') {
		return;
	}

	ensureConfigLoaded().then(async () => {
		if (getConfig('enabled') !== 1) {
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
				await applyPageSettings(tabId, getPageSettings(page.id));
				break;
			}
		}
	}).catch(() => {
		// Keep behavior resilient, same as previous fire-and-forget approach.
	});
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
 * @returns {Promise<void>}
 */
async function applyPageSettings(tabId, settings) {
	if (settings === null || typeof settings !== 'object') {
		return;
	}

	if (typeof settings.css === 'string' && settings.css !== '') {
		await insertCss(tabId, settings.css);
	}

	if (typeof settings.js === 'string' && settings.js !== '') {
		await executeJs(tabId, settings.js);
	}
}

/**
 * Insert CSS into tab using MV3 scripting API.
 * @param {number} tabId Target tab id.
 * @param {string} css CSS source.
 * @returns {Promise<void>}
 */
async function insertCss(tabId, css) {
	try {
		await chrome.scripting.insertCSS({
			target: {
				tabId: tabId
			},
			css: css
		});
	} catch (error) {
		// Keep silent to preserve previous behavior of ignored injection failures.
	}
}

/**
 * Execute JS with best available MV3-compatible method.
 * @param {number} tabId Target tab id.
 * @param {string} code JavaScript source.
 * @returns {Promise<void>}
 */
async function executeJs(tabId, code) {
	const usedUserScripts = await executeWithUserScripts(tabId, code);
	if (usedUserScripts) {
		return;
	}

	logUserScriptsUnavailable();
}

/**
 * Check whether userScripts API is available and enabled.
 * @returns {Promise<boolean>}
 */
async function isUserScriptsEnabled() {
	if (userScriptsEnabled !== null) {
		return userScriptsEnabled;
	}

	if (typeof chrome.userScripts === 'undefined' || typeof chrome.userScripts.getScripts !== 'function') {
		userScriptsEnabled = false;
		return userScriptsEnabled;
	}

	try {
		await chrome.userScripts.getScripts();
		userScriptsEnabled = true;
	} catch (error) {
		userScriptsEnabled = false;
	}

	return userScriptsEnabled;
}

/**
 * Execute JS using userScripts API (preferred for arbitrary user code).
 * @param {number} tabId Target tab id.
 * @param {string} code JavaScript source.
 * @returns {Promise<boolean>}
 */
async function executeWithUserScripts(tabId, code) {
	if (typeof chrome.userScripts === 'undefined' || typeof chrome.userScripts.execute !== 'function') {
		return false;
	}

	const enabled = await isUserScriptsEnabled();
	if (!enabled) {
		return false;
	}

	try {
		await chrome.userScripts.execute({
			target: {
				tabId: tabId
			},
			js: [
				{
					code: code
				}
			]
		});
		return true;
	} catch (error) {
		userScriptsEnabled = false;
		return false;
	}
}

/**
 * Log one-time warning when user script execution is unavailable.
 */
function logUserScriptsUnavailable() {
	if (userScriptsWarningLogged) {
		return;
	}

	userScriptsWarningLogged = true;
	console.warn('ModWe: User JS execution requires chrome.userScripts. Enable "Allow User Scripts" for this extension.');
}

/**
 * Parse general settings JSON from config.
 * @param {*} value Stored value.
 * @returns {Object}
 */
function parseGeneralConfig(value) {
	if (value && typeof value === 'object') {
		return value;
	}

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

	ensureConfigLoaded().then(() => {
		handleRuntimeMessage(message);
	}).catch(() => {
		// Ignore to keep message loop robust.
	});
}

/**
 * Process one runtime message after config is loaded.
 * @param {Object} message Runtime message.
 */
function handleRuntimeMessage(message) {
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
				value: normalizeGeneralConfig(getConfig('general'))
			});
			break;
		case 'config-set-general': {
			const currentGeneral = normalizeGeneralConfig(getConfig('general'));
			const value = parseGeneralConfig(message.value);
			const mergedGeneral = {
				searches: typeof value.searches !== 'undefined' ? value.searches : currentGeneral.searches,
				searches_migrated: 1,
				search_last: typeof value.search_last !== 'undefined' ? value.search_last : currentGeneral.search_last
			};
			const general = normalizeGeneralConfig(mergedGeneral);
			general.searches_migrated = 1;
			setConfig('general', JSON.stringify(general));
			sendRuntimeMessage({
				type: 'config-set-general-done'
			});
			break;
		}
		default:
			throw Error('Unsupported message (' + message.type + ') by background script');
	}
}

/**
 * Configure extension action visibility rules.
 */
function initPageActionRules() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
		chrome.declarativeContent.onPageChanged.addRules([
			{
				conditions: [new chrome.declarativeContent.PageStateMatcher({})],
				actions: [new chrome.declarativeContent.ShowAction()]
			}
		]);
	});
}

initBackground();
