if (typeof TCH === 'undefined') {
	var TCH = {};
}

if (typeof TCH.Options === 'undefined') {
	TCH.Options = {
		dynamicParams: {},
		pageSettings: null,
		cssEditor: null,
		jsEditor: null,

		/**
		 * Options initialization.
		 */
		Init: function () {
			const dynamic = document.querySelectorAll ('.dynamic');

			for (let i = 0; i < dynamic.length; i++) {
				(dynamic => {
					const params = {
						id: dynamic.id,
						container: dynamic,
						items: dynamic.querySelector ('.items'),
						template: dynamic.querySelector ('.template'),
						add: dynamic.querySelector ('.add'),
						config: {
							key: dynamic.dataset.key
						}
					};

					this.dynamicParams [dynamic.id] = params;

					params.template.parentNode.removeChild (params.template);

					params.add.addEventListener ('click', () => this.Add (params));

					setTimeout (() => {
						browser.runtime.sendMessage ({
							type: 'config-get',
							key: params.config.key,
							identificator: dynamic.id
						});
					}, 1);
				}) (dynamic [i]);
			}

			document.getElementById ('page-settings').addEventListener ('submit', this.PageSettingsSave.bind (this));
			document.getElementById ('page-settings-close').addEventListener ('click', this.PageSettingsClose.bind (this));

			browser.runtime.onMessage.addListener (this.OnMessage.bind (this));
		},

		/**
		 * Initialize dynamic items by data.
		 */
		InitItems: function (params, data) {
			if (data !== null && Array.isArray (data)) {
				for (let i = 0; i < data.length; i++) {
					this.Add (params, data [i]);
				}
			}
		},

		/**
		 * Return cloned template.
		 */
		Clone: function (params) {
			const newClone = document.createElement ('div');
			newClone.className = params.template.className;
			newClone.classList.remove ('template');
			newClone.innerHTML = params.template.innerHTML;

			newClone.querySelector ('.page-settings').addEventListener ('click', e => this.PageSettings (e, params));

			newClone.querySelector ('.remove').addEventListener ('click', e => this.Remove (e, params));

			TCH.Utils.NodeListFunc (newClone.querySelectorAll ('input'), element => element.addEventListener ('change', () => this.Save (params)));

			return newClone;
		},

		/**
		 * Add item.
		 */
		Add: function (params, data) {
			const newClone = this.Clone (params);
			
			let id = null;
			if (typeof data !== 'undefined') {
				id = data.id;
			} else {
				params.add.disabled = true;

				id = new Date ().getTime ();
			}

			newClone.id = 'item-' + id;
			newClone.dataset.id = id;

			params.items.appendChild (newClone);

			if (typeof data !== 'undefined') {
				newClone.querySelector ('.name').value = data.name;
				newClone.querySelector ('.url').value = data.url;
				newClone.querySelector ('.regexp').value = data.regexp;
			} else {
				setTimeout (() => params.add.disabled = false, 400);

				this.Save (params);
			}
		},

		/**
		 * Remove item.
		 */
		Remove: function (e, params) {
			const item = TCH.Utils.FindNearestParent (e.target, 'item');

			const panel = document.getElementById ('page-settings-panel');
			if (panel.style.display !== 'none') {
				const openPageId = document.getElementById ('page-id').value;
				const removingPageId = item.dataset.id;

				if (openPageId === removingPageId) {
					this.PageSettingsClose ();
				}
			}

			item.parentNode.removeChild (item);

			this.Save (params);
		},

		/**
		 * Save items to config.
		 */
		Save: function (params) {
			const data = [];

			TCH.Utils.NodeListFunc (params.container.querySelectorAll ('.item'), element => {
				data.push ({
					id: element.dataset.id,
					name: element.querySelector ('.name').value,
					url: element.querySelector ('.url').value,
					regexp: element.querySelector ('.regexp').value
				});
			});

			browser.runtime.sendMessage ({
				type: 'config-set',
				key: params.config.key,
				value: data
			});
		},

		/**
		 * Message received, handle according to type.
		 */
		OnMessage: function (message) {
			if (typeof message.type !== 'undefined') {
				switch (message.type) {
					case 'config-get':
						if (message.key === 'pages') {
							this.InitItems (this.dynamicParams [message.identificator], message.value);
						} else if (message.key === 'page_settings') {
							this.PageSettingsInit (message.value, message.identificator);
						}
						break;
					default:
						throw Error ('Unsupported message by options script');
				}
			}
		},

		/**
		 * Open settings for selected page.
		 */
		PageSettings: function (e, params) {
			const panel = document.getElementById ('page-settings-panel');

			const item = TCH.Utils.FindNearestParent (e.target, 'item');

			browser.runtime.sendMessage ({
				type: 'config-get',
				key: 'page_settings',
				identificator: item.dataset.id
			});

			panel.style.display = 'block';
		},

		/**
		 * Initialize current settings for selected page.
		 */
		PageSettingsInit: function (settings, identificator) {
			if (settings === null) {
				settings = {};
			}
			this.pageSettings = settings;

			const pageSettings = typeof this.pageSettings [identificator] !== 'undefined' ? this.pageSettings [identificator] : {
				css: '',
				js: ''
			};
			this.pageSettings [identificator] = pageSettings;

			const cssArea = document.getElementById ('page-css');
			const jsArea = document.getElementById ('page-js');

			document.getElementById ('page-id').value = identificator;
			cssArea.value = pageSettings.css;
			jsArea.value = pageSettings.js;

			if (this.cssEditor === null) {
				this.cssEditor = CodeMirror.fromTextArea (cssArea, {
					value: cssArea.value,
					mode: 'css',
					theme: 'darcula',
					lineNumbers: true,
					lineWrapping: true
				});

				this.cssEditor.on ('change', (instance, changeObj) => {
					cssArea.value = instance.doc.getValue ();
				});
			} else {
				this.cssEditor.setValue (cssArea.value);
			}

			if (this.jsEditor === null) {
				this.jsEditor = CodeMirror.fromTextArea (jsArea, {
					value: jsArea.value,
					mode: 'javascript',
					theme: 'darcula',
					lineNumbers: true,
					lineWrapping: true
				});

				this.jsEditor.on ('change', (instance, changeObj) => {
					jsArea.value = instance.doc.getValue ();
				});
			} else {
				this.jsEditor.setValue (jsArea.value);
			}
		},

		/**
		 * Save settings for selected page.
		 */
		PageSettingsSave: function (e) {
			e.preventDefault ();

			const id = document.getElementById ('page-id').value;
			this.pageSettings [id].css = document.getElementById ('page-css').value;
			this.pageSettings [id].js = document.getElementById ('page-js').value;

			browser.runtime.sendMessage ({
				type: 'config-set',
				key: 'page_settings',
				value: this.pageSettings
			});
		},

		/**
		 * Close page settings.
		 */
		PageSettingsClose: function () {
			const panel = document.getElementById ('page-settings-panel');

			panel.style.display = 'none';
		}
	};

	TCH.Options.Init ();
}
