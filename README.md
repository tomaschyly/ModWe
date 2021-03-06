# ModWe

Originally for Firefox (v1.x.x), now for browsers based on Chromium (v2.x.x) extension to modify websites using custom CSS and JS snippets.

Usefull for Developers, you can add Pages for which you can write CSS and JS snippets wich will be injected into them. All of them are custom writen by you on the Options page.

Both CSS and JS get inserted only after Page has been fully loaded. They are also inserted only on Pages that match RegExp which you write for them.

This extension does not sync with your profile, instead you can export and import your options from the Options page.

## Installation

### Firefox (v1.x.x)

1. Go [here](https://addons.mozilla.org/en-US/firefox/addon/modwe/) and click Add to Firefox.

### Chrome (v2.x.x)

1. Go [here](https://github.com/tomaschyly/ModWe/releases) and download latest archive.
2. Unzip somewhere.
3. In your browser go to extensions and with developer mode enabled load unpacked extension.

## Important Notes

There are no snippets provided with the extensions. You have to write all CSS and JS.

All the data is stored locally, it is not transmitted online.

## How to Use

1. Use the toolbar button to open popup.
2. Use the right button to open options.
3. Add Page, write any Name you want as identifier. Url is used from popup for quick navigation. RegExp needs to be valid RegExp (e.g.: /google\.com/), it is used by script to determine correct Page for CSS/JS injection.
4. Use the settings button to open Page settings, here you can write your CSS/JS.
5. In popup make sure to toggle to Enabled.
6. Now when you visit any Page which is valid by your RegExp, CSS/JS will be injected.
