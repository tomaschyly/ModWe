/**
 * Request one config value from background.
 * @param {string} key Config key to fetch.
 * @param {string} identificator Optional request identifier.
 */
function requestConfig(key, identificator) {
	sendRuntimeMessage({
		type: 'config-get',
		key: key,
		identificator: identificator
	});
}

/**
 * Request all config values from background.
 */
function requestAllConfig() {
	sendRuntimeMessage({
		type: 'config-get-all'
	});
}

/**
 * Persist one config value.
 * @param {string} key Config key.
 * @param {*} value Config value.
 */
function setConfigValue(key, value) {
	sendRuntimeMessage({
		type: 'config-set',
		key: key,
		value: value
	});
}

/**
 * Persist whole config object.
 * @param {Object} data Full config data object.
 */
function setAllConfigValues(data) {
	sendRuntimeMessage({
		type: 'config-set-all',
		data: data
	});
}

/**
 * Request general settings object.
 */
function requestGeneralConfig() {
	sendRuntimeMessage({
		type: 'config-get-general'
	});
}

/**
 * Persist general settings object.
 * @param {Object} value General settings.
 */
function setGeneralConfig(value) {
	sendRuntimeMessage({
		type: 'config-set-general',
		value: value
	});
}
