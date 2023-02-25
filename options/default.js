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
            this.Data.Init ();

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
                        chrome.runtime.sendMessage ({
                            type: 'config-get',
                            key: params.config.key,
                            identificator: dynamic.id
                        });
                        }, 1);
                }) (dynamic [i]);
            }

            document.getElementById ('page-settings').addEventListener ('submit', this.PageSettingsSave.bind (this));
            document.getElementById ('page-settings-close').addEventListener ('click', this.PageSettingsClose.bind (this));
            document.getElementById ('page-settings-close-nosave').addEventListener ('click', this.PageSettingsClose.bind (this));

            document.getElementById ('general-save').addEventListener ('click', this.GeneralSave.bind (this));

            setTimeout (() => {
                chrome.runtime.sendMessage ({
                    type: 'config-get-general',
                });
            }, 1);

            chrome.runtime.onMessage.addListener (this.OnMessage.bind (this));
		},

		/**
		 * Initialize dynamic items by data.
		 */
		InitItems: function (params, data) {
			while (params.items.lastChild) {
				params.items.removeChild (params.items.lastChild);
			}

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

			chrome.runtime.sendMessage ({
				type: 'config-set',
				key: params.config.key,
				value: data
			});
		},

		Data: {
			/**
			 * Data initialization.
			 */
			Init: function () {
				document.getElementById ('import').addEventListener ('click', this.Import.bind (this));
				document.getElementById ('export').addEventListener ('click', this.Export.bind (this));

				document.getElementById ('import-file').addEventListener ('change', this.ImportFile.bind (this));
			},

			/**
			 * Import options from file.
			 */
			Import: function () {
				document.getElementById ('import-file').click ();
			},

			/**
			 * Import file changed, import json as options.
			 */
			ImportFile: function () {
				const input = document.getElementById ('import-file');

				if (input.files.length > 0) {
					const file = input.files [0];
					const reader = new FileReader ();

					reader.onload = e => {
						const fileContents = e.target.result;

						if (fileContents !== '') {
							const data = JSON.parse (fileContents);

							if (typeof data === 'object') {
								chrome.runtime.sendMessage ({
									type: 'config-set-all',
									data: data
								});

								setTimeout (() => {
									chrome.runtime.sendMessage ({
										type: 'config-get',
										key: 'pages',
										identificator: 'pages'
									});
								}, 1);
							}
						}
					};
					reader.readAsBinaryString (file);
				}

				input.value = '';
			},

			/**
			 * Export options to file.
			 */
			Export: function () {
				chrome.runtime.sendMessage ({
					type: 'config-get-all'
				});
			},

			/**
			 * Have all options, now export using default browser download.
			 */
			ExportData: async function (data) {
				data = JSON.stringify (data);
				const blob = new Blob ([data], {type: 'application/json'});

				const onChangeListener = downloadDelta => {
					if (downloadDelta.id === downloadId && downloadDelta.state && downloadDelta.state.current === 'complete') {
						URL.revokeObjectURL (dataUrl);

						chrome.downloads.onChanged.removeListener (onChangeListener);
					}
				};

				const dataUrl = URL.createObjectURL (blob);
				chrome.downloads.onChanged.addListener (onChangeListener);
				const downloadId = await chrome.downloads.download ({
					url: dataUrl,
					filename: 'ModWe.json'
				});

				TCH.Options.Modal.Open ('Options exported to file - ModWe.json');
			}
		},

		Modal: {
			closeTimeout: null,

			/**
			 * Open modal with message and using animation.
			 */
			Open: function (message) {
				const self = this;

				if (this.closeTimeout !== null) {
					clearTimeout (this.closeTimeout);
					this.closeTimeout = null;
				}

				const modal = document.getElementById ('modal');

				modal.querySelector ('.modal-content p').textContent = message;

				modal.classList.add ('visible');
				const height = modal.getBoundingClientRect ().height;
				modal.style.top = '-' + height + 'px';
				modal.classList.remove ('visible');

				setTimeout (function () {
					modal.classList.add ('visible');

					setTimeout (function () {
						modal.style.top = '0px';

						self.closeTimeout = setTimeout (function () {
							self.Close ();
						}, 4 * 1000);
					}, 100);
				}, 100);
			},

			/**
			 * Close the modal using animation.
			 */
			Close: function () {
				const modal = document.getElementById ('modal');

				const height = modal.getBoundingClientRect ().height;
				modal.style.top = '-' + height + 'px';
			}
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
					case 'config-get-all':
						this.Data.ExportData (message.data);
						break;
					case 'config-set-done':
						if (message.key === 'pages') {
							this.Modal.Open ('Pages saved');
						} else if (message.key === 'page_settings') {
							this.Modal.Open ('Page settings saved');
						}
						break;
					case 'config-set-all-done':
						this.Modal.Open ('Options imported from file');
						break;
                    case 'config-get-general':
                        this.GeneralInit (message.value);
                        break;
					default:
						throw Error ('Unsupported message (' + message.type + ') by options script');
				}
			}
		},

		/**
		 * Open settings for selected page.
		 */
		PageSettings: function (e, params) {
			const panel = document.getElementById ('page-settings-panel');

			const item = TCH.Utils.FindNearestParent (e.target, 'item');

			chrome.runtime.sendMessage ({
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

			chrome.runtime.sendMessage ({
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
		},

        /**
         * Init general settings.
         */
        GeneralInit: function (value) {
            document.getElementById ('search').value = value.search || '';
        },

        /**
         * Save general settings.
         */
        GeneralSave: function () {
            var search = document.getElementById ('search').value;

            chrome.runtime.sendMessage ({
                type: 'config-set-general',
                value: {
                    search: search
                }
            });
        }
	};

	TCH.Options.Init ();
}
