/**
 * Dynamic form params by container id.
 * @type {Object<string, Object>}
 */
const dynamicParams = {};

/**
 * Current enabled state.
 * @type {boolean}
 */
let enabled = false;

/**
 * Current page settings loaded from storage.
 * @type {Object|null}
 */
let pageSettings = null;

/**
 * CodeMirror CSS editor instance.
 * @type {*}
 */
let cssEditor = null;

/**
 * CodeMirror JS editor instance.
 * @type {*}
 */
let jsEditor = null;

/**
 * Timeout id used for modal auto-close.
 * @type {number|null}
 */
let modalCloseTimeout = null;

/**
 * Initialize options page.
 */
function initOptions() {
	initDataControls();
	initDynamicForms();

	document.getElementById('toggle-enabled').addEventListener('click', toggleEnabled);
	document.getElementById('page-settings').addEventListener('submit', savePageSettings);
	document.getElementById('page-settings-close').addEventListener('click', closePageSettings);
	document.getElementById('page-settings-close-nosave').addEventListener('click', closePageSettings);
	document.getElementById('general-save').addEventListener('click', saveGeneral);

	setTimeout(() => {
		requestConfig('enabled');
		requestGeneralConfig();
	}, 1);

	addRuntimeMessageListener(onRuntimeMessage);
}

/**
 * Initialize all dynamic forms.
 */
function initDynamicForms() {
	const dynamicContainers = document.querySelectorAll('.dynamic');

	for (let i = 0; i < dynamicContainers.length; i++) {
		const dynamicContainer = dynamicContainers [i];
		const params = createDynamicParams(dynamicContainer);

		dynamicParams [dynamicContainer.id] = params;
		params.template.parentNode.removeChild(params.template);
		params.add.addEventListener('click', () => addItem(params));

		setTimeout(() => {
			requestConfig(params.config.key, dynamicContainer.id);
		}, 1);
	}
}

/**
 * Build params object for one dynamic form.
 * @param {HTMLElement} dynamicContainer Dynamic form container.
 * @returns {Object}
 */
function createDynamicParams(dynamicContainer) {
	return {
		id: dynamicContainer.id,
		container: dynamicContainer,
		items: dynamicContainer.querySelector('.items'),
		template: dynamicContainer.querySelector('.template'),
		add: dynamicContainer.querySelector('.add'),
		config: {
			key: dynamicContainer.dataset.key
		}
	};
}

/**
 * Initialize dynamic items from config data.
 * @param {Object} params Dynamic form params.
 * @param {Array|null} data Stored list data.
 */
function initItems(params, data) {
	while (params.items.lastChild) {
		params.items.removeChild(params.items.lastChild);
	}

	if (data !== null && Array.isArray(data)) {
		for (let i = 0; i < data.length; i++) {
			addItem(params, data [i]);
		}
	}

	updateItemPositions(params);
}

/**
 * Create one item node from template.
 * @param {Object} params Dynamic form params.
 * @returns {HTMLElement}
 */
function cloneItem(params) {
	const newClone = document.createElement('div');
	newClone.className = params.template.className;
	newClone.classList.remove('template');
	newClone.innerHTML = params.template.innerHTML;

	newClone.querySelector('.page-settings').addEventListener('click', e => openPageSettings(e, params));
	newClone.querySelector('.remove').addEventListener('click', e => removeItem(e, params));

	const positionInput = newClone.querySelector('.position');
	if (positionInput !== null) {
		positionInput.addEventListener('change', e => moveItemToPosition(e, params));
	}

	forEachNode(newClone.querySelectorAll('input'), element => {
		if (element.classList.contains('position')) {
			return;
		}

		element.addEventListener('change', () => saveItems(params));
	});

	return newClone;
}

/**
 * Add one item to dynamic form.
 * @param {Object} params Dynamic form params.
 * @param {Object|undefined} data Existing item data.
 */
function addItem(params, data) {
	const newClone = cloneItem(params);

	let id = null;
	if (typeof data !== 'undefined') {
		id = data.id;
	} else {
		params.add.disabled = true;
		id = new Date().getTime();
	}

	newClone.id = 'item-' + id;
	newClone.dataset.id = id;
	params.items.appendChild(newClone);

	if (typeof data !== 'undefined') {
		newClone.querySelector('.name').value = data.name;
		newClone.querySelector('.url').value = data.url;
		newClone.querySelector('.regexp').value = data.regexp;
		updateItemPositions(params);
		return;
	}

	setTimeout(() => {
		params.add.disabled = false;
	}, 400);

	updateItemPositions(params);
	saveItems(params);
}

/**
 * Remove item from dynamic form.
 * @param {Event} e Remove click event.
 * @param {Object} params Dynamic form params.
 */
function removeItem(e, params) {
	const item = findNearestParent(e.target, 'item');

	const panel = document.getElementById('page-settings-panel');
	if (panel.style.display !== 'none') {
		const openPageId = document.getElementById('page-id').value;
		const removingPageId = item.dataset.id;

		if (openPageId === removingPageId) {
			closePageSettings();
		}
	}

	item.parentNode.removeChild(item);
	updateItemPositions(params);
	saveItems(params);
}

/**
 * Recalculate and display positions for all item rows.
 * @param {Object} params Dynamic form params.
 */
function updateItemPositions(params) {
	const itemNodes = params.items.querySelectorAll('.item');
	const maxPosition = Math.max(0, itemNodes.length - 1);

	forEachNode(itemNodes, (element, index) => {
		const positionInput = element.querySelector('.position');
		if (positionInput === null) {
			return;
		}

		positionInput.min = '0';
		positionInput.max = '' + maxPosition;
		positionInput.value = '' + index;
	});
}

/**
 * Move one item based on entered position and persist new order.
 * @param {Event} e Position input change event.
 * @param {Object} params Dynamic form params.
 */
function moveItemToPosition(e, params) {
	const item = findNearestParent(e.target, 'item');
	if (item === null) {
		return;
	}

	const itemNodes = params.items.querySelectorAll('.item');
	const maxPosition = itemNodes.length - 1;
	if (maxPosition < 0) {
		return;
	}

	let currentPosition = -1;
	forEachNode(itemNodes, (element, index) => {
		if (element === item) {
			currentPosition = index;
		}
	});

	if (currentPosition < 0) {
		return;
	}

	let requestedPosition = parseInt(e.target.value, 10);
	if (isNaN(requestedPosition)) {
		requestedPosition = currentPosition;
	}
	requestedPosition = Math.max(0, requestedPosition);
	requestedPosition = Math.min(requestedPosition, maxPosition);

	if (requestedPosition !== currentPosition) {
		const targetItem = itemNodes [requestedPosition];
		if (requestedPosition > currentPosition) {
			params.items.insertBefore(item, targetItem.nextSibling);
		} else {
			params.items.insertBefore(item, targetItem);
		}
	}

	updateItemPositions(params);
	saveItems(params);
}

/**
 * Persist dynamic form items to storage.
 * @param {Object} params Dynamic form params.
 */
function saveItems(params) {
	const data = [];

	forEachNode(params.container.querySelectorAll('.item'), element => {
		data.push({
			id: element.dataset.id,
			name: element.querySelector('.name').value,
			url: element.querySelector('.url').value,
			regexp: element.querySelector('.regexp').value
		});
	});

	setConfigValue(params.config.key, data);
}

/**
 * Initialize import/export controls.
 */
function initDataControls() {
	document.getElementById('import').addEventListener('click', importOptions);
	document.getElementById('export').addEventListener('click', exportOptions);
	document.getElementById('import-file').addEventListener('change', importFile);
}

/**
 * Trigger import file chooser.
 */
function importOptions() {
	document.getElementById('import-file').click();
}

/**
 * Handle chosen import file and persist config.
 */
function importFile() {
	const input = document.getElementById('import-file');

	if (input.files.length > 0) {
		const file = input.files [0];
		const reader = new FileReader();

		reader.onload = e => {
			const fileContents = e.target.result;

			if (fileContents !== '') {
				const data = JSON.parse(fileContents);

				if (typeof data === 'object') {
					setAllConfigValues(data);

					setTimeout(() => {
						requestConfig('pages', 'pages');
						requestGeneralConfig();
					}, 1);
				}
			}
		};
		reader.readAsBinaryString(file);
	}

	input.value = '';
}

/**
 * Request full config for export.
 */
function exportOptions() {
	requestAllConfig();
}

/**
 * Export full config as JSON download.
 * @param {Object} data Full config data.
 */
async function exportData(data) {
	const serializedData = JSON.stringify(data);
	const blob = new Blob([serializedData], {type: 'application/json'});

	const onChangeListener = downloadDelta => {
		if (downloadDelta.id === downloadId && downloadDelta.state && downloadDelta.state.current === 'complete') {
			URL.revokeObjectURL(dataUrl);
			chrome.downloads.onChanged.removeListener(onChangeListener);
		}
	};

	const dataUrl = URL.createObjectURL(blob);
	chrome.downloads.onChanged.addListener(onChangeListener);
	const downloadId = await chrome.downloads.download({
		url: dataUrl,
		filename: 'ModWe.json'
	});

	openModal('Options exported to file - ModWe.json');
}

/**
 * Open modal with message and auto-close animation.
 * @param {string} message Modal message.
 */
function openModal(message) {
	if (modalCloseTimeout !== null) {
		clearTimeout(modalCloseTimeout);
		modalCloseTimeout = null;
	}

	const modal = document.getElementById('modal');
	modal.querySelector('.modal-content p').textContent = message;

	modal.classList.add('visible');
	const height = modal.getBoundingClientRect().height;
	modal.style.top = '-' + height + 'px';
	modal.classList.remove('visible');

	setTimeout(() => {
		modal.classList.add('visible');

		setTimeout(() => {
			modal.style.top = '0px';

			modalCloseTimeout = setTimeout(() => {
				closeModal();
			}, 4 * 1000);
		}, 100);
	}, 100);
}

/**
 * Close modal with animation.
 */
function closeModal() {
	const modal = document.getElementById('modal');
	const height = modal.getBoundingClientRect().height;

	modal.style.top = '-' + height + 'px';
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
			if (message.key === 'enabled') {
				initEnabled(message.value === 1);
			} else if (message.key === 'pages') {
				initItems(dynamicParams [message.identificator], message.value);
			} else if (message.key === 'page_settings') {
				initPageSettings(message.value, message.identificator);
			}
			break;
		case 'config-get-all':
			exportData(message.data);
			break;
		case 'config-set-done':
			if (message.key === 'pages') {
				openModal('Pages saved');
			} else if (message.key === 'page_settings') {
				openModal('Page settings saved');
			}
			break;
		case 'config-set-all-done':
			openModal('Options imported from file');
			break;
		case 'config-get-general':
			initGeneral(message.value);
			break;
		default:
			throw Error('Unsupported message (' + message.type + ') by options script');
	}
}

/**
 * Initialize enabled button state.
 * @param {boolean} value Current enabled value.
 */
function initEnabled(value) {
	enabled = value;

	const button = document.getElementById('toggle-enabled');
	if (enabled) {
		button.classList.add('enabled');
		button.textContent = 'Enabled';
		return;
	}

	button.classList.remove('enabled');
	button.textContent = 'Disabled';
}

/**
 * Toggle enabled state and persist it.
 */
function toggleEnabled() {
	initEnabled(!enabled);
	setConfigValue('enabled', enabled ? 1 : 0);
}

/**
 * Open page settings panel for selected page.
 * @param {Event} e Settings button click event.
 * @param {Object} params Dynamic form params.
 */
function openPageSettings(e, params) {
	const panel = document.getElementById('page-settings-panel');
	const item = findNearestParent(e.target, 'item');

	requestConfig('page_settings', item.dataset.id);
	panel.style.display = 'block';
}

/**
 * Initialize editor values for selected page.
 * @param {Object|null} settings Loaded page settings map.
 * @param {string} identificator Selected page id.
 */
function initPageSettings(settings, identificator) {
	if (settings === null) {
		settings = {};
	}
	pageSettings = settings;

	const currentPageSettings = typeof pageSettings [identificator] !== 'undefined' ? pageSettings [identificator] : {
		css: '',
		js: ''
	};
	pageSettings [identificator] = currentPageSettings;

	const cssArea = document.getElementById('page-css');
	const jsArea = document.getElementById('page-js');

	document.getElementById('page-id').value = identificator;
	cssArea.value = currentPageSettings.css;
	jsArea.value = currentPageSettings.js;

	if (cssEditor === null) {
		cssEditor = CodeMirror.fromTextArea(cssArea, {
			value: cssArea.value,
			mode: 'css',
			theme: 'darcula',
			lineNumbers: true,
			lineWrapping: true
		});

		cssEditor.on('change', instance => {
			cssArea.value = instance.doc.getValue();
		});
	} else {
		cssEditor.setValue(cssArea.value);
	}

	if (jsEditor === null) {
		jsEditor = CodeMirror.fromTextArea(jsArea, {
			value: jsArea.value,
			mode: 'javascript',
			theme: 'darcula',
			lineNumbers: true,
			lineWrapping: true
		});

		jsEditor.on('change', instance => {
			jsArea.value = instance.doc.getValue();
		});
	} else {
		jsEditor.setValue(jsArea.value);
	}
}

/**
 * Persist selected page settings.
 * @param {Event} e Form submit event.
 */
function savePageSettings(e) {
	e.preventDefault();

	const id = document.getElementById('page-id').value;
	pageSettings [id].css = document.getElementById('page-css').value;
	pageSettings [id].js = document.getElementById('page-js').value;

	setConfigValue('page_settings', pageSettings);
}

/**
 * Hide page settings panel.
 */
function closePageSettings() {
	const panel = document.getElementById('page-settings-panel');
	panel.style.display = 'none';
}

/**
 * Normalize search URL list by trimming values and removing empty items.
 * @param {Array|*} value Raw search URL list.
 * @returns {Array<string>}
 */
function normalizeSearchList(value) {
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
 * Parse textarea content into normalized search URL list.
 * @param {string} value Textarea value.
 * @returns {Array<string>}
 */
function parseSearchListInput(value) {
	return normalizeSearchList((value || '').split('\n'));
}

/**
 * Initialize general settings form.
 * @param {Object} value General settings.
 */
function initGeneral(value) {
	const general = value && typeof value === 'object' ? value : {};
	const searches = normalizeSearchList(general.searches);

	document.getElementById('searches').value = searches.join('\n');
}

/**
 * Save general settings form.
 */
function saveGeneral() {
	const searches = parseSearchListInput(document.getElementById('searches').value);

	setGeneralConfig({
		searches: searches
	});
}

initOptions();
