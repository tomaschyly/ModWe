if (typeof TCH === 'undefined') {
	var TCH = {};
}

if (typeof TCH.Background === 'undefined') {
	TCH.Background = {
		/**
		 * Background initialization.
		 */
		Init: async function () {
			await this.Config.Init ();

			this.ContentScripts.Init ();

			chrome.runtime.onMessage.addListener (this.OnMessage.bind (this));

			// chrome.runtime.onInstalled.addListener (() => {
			// 	chrome.declarativeContent.onPageChanged.removeRules (undefined, () => {
			// 		chrome.declarativeContent.onPageChanged.addRules ([
			// 			{
			// 				conditions: [new chrome.declarativeContent.PageStateMatcher({})],
			// 				actions: [new chrome.declarativeContent.ShowPageAction ()]
			// 			}
			// 		]);
			// 	});
			// });
			chrome.declarativeContent.onPageChanged.removeRules (undefined, () => {
				chrome.declarativeContent.onPageChanged.addRules ([
					{
						conditions: [new chrome.declarativeContent.PageStateMatcher({})],
						actions: [new chrome.declarativeContent.ShowPageAction ()]
					}
				]);
			});
		},

		Config: {
			data: {},

			/**
			 * Config initialization.
			 */
			Init: function () {
				return new Promise ((resolve, reject) => {
                    chrome.storage.local.get (['enabled', 'pages', 'page_settings', 'general'], response => {
						this.data = response;

						resolve ();
					});
				});
			},

			/**
			 * Get data for key.
			 */
			Get: function (key) {
				if (typeof this.data [key] !== 'undefined') {
					return this.data [key];
				}

				return null;
			},

			/**
			 * Get all of data.
			 */
			GetAll: function () {
				return this.data;
			},

			/**
			 * Set data for key.
			 */
			Set: function (key, value) {
				this.data [key] = value;

				chrome.storage.local.set (this.data);
			},

			/**
			 * Set all of data.
			 */
			SetAll: function (data) {
				this.data = data;

				chrome.storage.local.set (this.data);
			}
		},

		ContentScripts: {
			/**
			 * ContentScripts initialization.
			 */
			Init: function () {
				const listenerParams = {
					properties: ['status']
				};

				if (!chrome.tabs.onUpdated.hasListener (this.OnTabUpdate.bind (this)/* , listenerParams */)) {
					chrome.tabs.onUpdated.addListener (this.OnTabUpdate.bind (this)/* , listenerParams */);
				}
			},

			/**
			 * If enabled check pages and insert/execute correct CSS/JS.
			 */
			OnTabUpdate: function (tabId, changeInfo, tab) {
				if (changeInfo.status === 'complete' && TCH.Background.Config.Get ('enabled') === 1) {
					const pages = TCH.Background.Config.Get ('pages') !== null ? TCH.Background.Config.Get ('pages') : [];

					if (pages.length > 0) {
						const url = tab.url;

						for (let i = 0; i < pages.length; i++) {
							if (typeof pages [i].regexp === 'string' && pages [i].regexp !== '') {
								const regexp = new RegExp (pages [i].regexp);

								if (regexp.test (url)) {
									const settings = this.PageSettings (pages [i].id);
									
									if (settings !== null) {
										if (typeof settings.css === 'string' && settings.css !== '') {
											chrome.tabs.insertCSS (tabId, {
												code: settings.css
											});
										}

										if (typeof settings.js === 'string' && settings.js !== '') {
											chrome.tabs.executeScript (tabId, {
												code: settings.js
											});
										}
									}

									break;
								}
							}
						}
					}
				}
			},

			/**
			 * Get page settings for id.
			 */
			PageSettings: function (id) {
				const settings = TCH.Background.Config.Get ('page_settings') !== null ? TCH.Background.Config.Get ('page_settings') : {};

				return typeof settings [id] !== undefined ? settings [id] : null;
			}
		},

		/**
		 * Message received, handle according to type.
		 */
		OnMessage: function (message) {
			if (typeof message.type !== 'undefined') {
				switch (message.type) {
					case 'config-get':
						chrome.runtime.sendMessage ({
							type: 'config-get',
							key: message.key,
							value: this.Config.Get (message.key),
							identificator: message.identificator
						});
						break;
					case 'config-get-all':
						chrome.runtime.sendMessage ({
							type: 'config-get-all',
							data: this.Config.GetAll ()
						});
						break;
					case 'config-set':
						this.Config.Set (message.key, message.value);

						chrome.runtime.sendMessage ({
							type: 'config-set-done',
							key: message.key
						});
						break;
					case 'config-set-all':
						this.Config.SetAll (message.data);

						chrome.runtime.sendMessage ({
							type: 'config-set-all-done'
						});
						break;
                    case 'config-get-general':
                        var general = this.Config.Get ('general');

                        chrome.runtime.sendMessage ({
                            type: 'config-get-general',
                            value: general ? JSON.parse (general) : {}
                        });
                        break;
                    case 'config-set-general':
                        this.Config.Set ('general', JSON.stringify (message.value || {}));

						chrome.runtime.sendMessage ({
                            type: 'config-set-general-done'
						});
                        break;
					default:
						throw Error ('Unsupported message (' + message.type + ') by background script');
				}
			}
		}
	};

	TCH.Background.Init ();
}
