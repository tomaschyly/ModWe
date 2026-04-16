# ModWe

ModWe is a Chromium extension that modifies websites using your own CSS and JS snippets.

## Version Support

Only **v2** is supported and maintained.

The old **v1** Firefox extension is no longer supported.

## Browser Compatibility

ModWe v2 targets Chromium-compatible browsers with Manifest V3 support.

It relies on `chrome.userScripts` for user JS execution.

Firefox support for v2 is **not provided**.

## Features

- Configure page rules using names, URLs, and RegExp matching.
- Inject custom CSS and JS into matched pages.
- Toggle ModWe quickly from the popup.
- Import and export configuration as JSON.
- Keep all data stored locally in extension storage.

## Installation

1. Download the latest release archive from: <https://github.com/tomaschyly/ModWe/releases>
2. Unzip it to a local folder.
3. Open your browser extension page.
4. Enable Developer Mode.
5. Load the unpacked extension folder.

## Important Requirement

For JS snippets to run, the browser option to allow user scripts for this extension must be enabled.

If user scripts are disabled, CSS may still apply but JS snippets will not execute.

## Usage

1. Open the popup from the toolbar.
2. Open Options from the popup.
3. Add a page entry and provide a valid RegExp (for example: `/google\.com/`).
4. Open page settings and write CSS/JS snippets.
5. Enable ModWe in the popup.
6. Visit a matching page to apply your snippets.
