if (typeof TCH === 'undefined') {
	var TCH = {};
}

if (typeof TCH.Popup === 'undefined') {
    TCH.Popup = {
        enabled: false,
        searchUrl: undefined,

        /**
		 * Popup initialization.
		 */
		Init: function () {
            document.getElementById ('options').addEventListener ('click', this.Options.bind (this));

            document.getElementById ('toggle-enabled').addEventListener ('click', this.ToggleEnabled.bind (this));

            document.getElementById ('navigate').addEventListener ('change', this.Navigate.bind (this));

            document.getElementById ('search').addEventListener ('click', this.Search.bind (this));

            document.getElementById ('open-urls').addEventListener ('keyup', this.OpenUrls.bind (this));

            setTimeout (() => {
                chrome.runtime.sendMessage ({
                    type: 'config-get',
                    key: 'enabled'
                });

                chrome.runtime.sendMessage ({
                    type: 'config-get',
                    key: 'pages'
                });

                chrome.runtime.sendMessage ({
                    type: 'config-get-general'
                });
            }, 1);

            chrome.runtime.onMessage.addListener (this.OnMessage.bind (this));
        },

        /**
		 * Initialize navigation by pages.
		 */
		InitNavigation: function (pages) {
            const navigate = document.getElementById ('navigate');

            if (pages.length > 0) {
                for (let i = 0; i < pages.length; i++) {
                    const option = document.createElement ('option');
                    option.value = pages [i].url;
                    option.textContent = pages [i].name;

                    navigate.appendChild (option);
                }
            } else {
                navigate.querySelector ('option').textContent = 'No pages found';
            }
        },

        /**
		 * Navigate current or new tab to selected url.
		 */
		Navigate: function () {
            const url = document.getElementById ('navigate').value;
            const newTab = document.getElementById ('navigate-new').checked;

            if (url !== '') {
                if (newTab) {
                    chrome.tabs.create ({
                        url: url
                    });

                    window.close ();
                } else {
                    chrome.tabs.query ({
                        active: true,
                        currentWindow: true
                    }, tabs => {
                        if (tabs.length > 0) {
                            const tab = tabs [0];

                            chrome.tabs.update (tab.id, {
                                url: url
                            });

                            window.close ();
                        } else {
                            this.Message ('<p>You have no tab active.</p>', true);
                        }
                    });
                }
            } else {
                this.Message ('<p>Selected page has no url associated.</p>', true);
            }
        },

        /**
         * Navigate to search specified in options.
         */
        Search: function () {
            const query = encodeURIComponent (document.getElementById ('query').value);
            const newTab = document.getElementById ('navigate-new').checked;

            if (this.searchUrl) {
                const url = this.searchUrl + query;

                if (newTab) {
                    chrome.tabs.create ({
                        url: url
                    });

                    window.close ();
                } else {
                    chrome.tabs.query ({
                        active: true,
                        currentWindow: true
                    }, tabs => {
                        if (tabs.length > 0) {
                            const tab = tabs [0];

                            chrome.tabs.update (tab.id, {
                                url: url
                            });

                            window.close ();
                        } else {
                            this.Message ('<p>You have no tab active.</p>', true);
                        }
                    });
                }
            } else {
                this.Message ('<p>Set search url first in options.</p>', true);
            }
        },

		/**
		 * Open pasted urls in tabs.
		 */
		OpenUrls: function () {
			const urls = document.getElementById ('open-urls').value;

			if (urls.trim () !== '') {
				let atLeastOne = false;
				const urlsSplit = urls.trim ().split ("\n");

				for (const url of urlsSplit) {
					if (url !== '') {
						chrome.tabs.create ({
							url: url
						});

						atLeastOne = true;
					}
				}

				if (atLeastOne) {
					window.close ();
				}
			}
		},

		/**
		 * Write informational message.
		 */
		Message: function (content, isError) {
			const container = document.getElementById ('message');

			container.classList.remove ('error');

			if (isError) {
				container.classList.add ('error');
			}

			container.innerHTML = content;
		},

		/**
		 * Message received, handle according to type.
		 */
		OnMessage: function (message) {
			if (typeof message.type !== 'undefined') {
				switch (message.type) {
					case 'config-get':
						if (message.key === 'enabled' && message.value !== null) {
							this.enabled = message.value === 1 ? true : false;

							if (this.enabled) {
								this.ToggleEnabled (true);
							}
						} else if (message.key === 'pages') {
							const pages = message.value !== null ? message.value : [];

							this.InitNavigation (pages);
                        }
						break;
                    case 'config-get-general':
                        this.searchUrl = message.value.search || undefined;
                        break;
					default:
						throw Error ('Unsupported message (' + message.type + ') by popup script');
				}
			}
		},

		/**
		 * Open options page.
		 */
		Options: function () {
			chrome.runtime.openOptionsPage ();

			window.close ();
		},

		/**
		 * Toggle enabled state.
		 */
		ToggleEnabled: function (newState) {
			this.enabled = typeof newState === 'boolean' ? newState : !this.enabled;

			const button = document.getElementById ('toggle-enabled');
			if (this.enabled) {
				button.classList.add ('enabled');
				button.textContent = 'Enabled';
			} else {
				button.classList.remove ('enabled');
				button.textContent = 'Disabled';
			}

			chrome.runtime.sendMessage ({
				type: 'config-set',
				key: 'enabled',
				value: this.enabled ? 1 : 0
			});
		}
	};

	TCH.Popup.Init ();
}
