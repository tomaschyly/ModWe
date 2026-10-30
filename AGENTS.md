# ModWe — Agent Instructions

ModWe is a Chromium browser extension that modifies websites using user-defined CSS and JS snippets.

These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides them.

## Branch safety rule

- For implementation work (any non-planning/non-question-only task), if current branch is `main` or `master`, ask the user first whether to switch to a new `version/*` or `feature/*` branch before making edits.
- Do not start code changes on `main`/`master` until the user confirms how to proceed.

## Release versioning rule

- Files that must be updated for each extension version bump:
    - `manifest.json` — update `version`

- Chromium extension version format for `manifest.json`:
    - Use `x.y.z` or `x.y.z.w` (1 to 4 dot-separated numeric parts)
    - Each part must be an integer in range `0..65535`
    - Do not use SemVer suffixes like `-beta` or `+build`

- When user asks to bump extension to `x.x.x` (or `x.x.x.x`), follow this order:
    1. Ensure branch `version/<requested-version>` exists and is checked out (create it if missing).
    2. Update version value in `manifest.json`.
    3. Commit version change with message: `Next version`.

## Release zip packaging

- Build release zip from repository root so `manifest.json` is at zip root (no wrapping parent directory).
- Keep all release artifacts in `releases/`.
- Read release version from `manifest.json` and name archive as `releases/ModWe-<version>-release.zip`.
- Exclude repository/editor metadata and agent docs from release archive:
    - `.git/*`
    - `.idea/*`
    - `.gitignore`
    - `AGENTS.md`
    - `CLAUDE.md`
    - `ModWe-*.zip`
    - `releases/*`
- Standard command:
```bash
VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json | head -n1)
mkdir -p releases
zip -rFS "releases/ModWe-${VERSION}-release.zip" . \
  -x '.git/*' '.idea/*' '.gitignore' 'AGENTS.md' 'CLAUDE.md' 'ModWe-*.zip' 'releases/*'
```
- Validate exclusions:
```bash
unzip -l "releases/ModWe-${VERSION}-release.zip" | rg 'AGENTS\.md|CLAUDE\.md|\.gitignore|^.* releases/' || true
```
- Validation output should be empty.

## General coding conventions

### Code commenting

- Add comments for functions at minimum.
- Add additional comments around special or non-obvious logic.

### Pattern consistency

- Following established project patterns is a requirement for every change, including small additions and fixes.
- Match the kind of implementation being changed or added: popup controls to popup controls, options forms to options forms, settings and migrations to their equivalents, background handlers to background handlers, and shared DOM, messaging, configuration, and tab helpers to comparable helpers.
- Follow the selected references in architecture, file placement, naming, data shapes, state and event handling, data access, DOM composition, loading/empty/error states, form validation and submission, styling, and formatting where applicable. Similar appearance alone is not sufficient.
- Reuse existing project DOM utilities and service helpers when they serve the required purpose. Read their implementations and representative usages before introducing a replacement, wrapper, or duplicate helper.
- Prefer consistency with established structure and naming over personal preferences, generic best practices, or a new abstraction. Do not introduce a different approach just because it is newer, shorter, or more familiar.
- When references differ, follow explicit user instructions and applicable `AGENTS.md` rules first, then the closest equivalent in the same domain. Use current equivalent implementations elsewhere in the project when the same domain has no suitable example. Do not copy obsolete code or known bugs; explain any necessary departure from the selected pattern.
- Place new functions, event handlers, configuration values, and controls next to related code. Preserve nearby declaration grouping and keep corresponding HTML, JavaScript, CSS, storage fields, and message handlers in a consistent order.

### Readable code and formatting

- Write code for a human maintainer: use descriptive names, straightforward control flow, and focused functions that follow the surrounding code's level of abstraction.
- Keep related logic together and separate distinct responsibilities into readable blocks. Avoid dense expressions, nested ternaries, and compressed one-liners when explicit steps are clearer.
- Follow the project's formatting configuration and nearby layout conventions. Formatting tools complement readable structure; passing a formatter does not by itself make code clear.
- Keep consistency changes scoped to the requested work; do not refactor unrelated code just to make it match.

### Local formatting and structure

- Follow the surrounding tab indentation, JSDoc comments, camelCase function names, and existing spacing conventions, including spaces before index brackets where already used. Do not apply another project's formatter defaults.
- Keep the existing plain JavaScript and classic script structure. Shared browser-page scripts are loaded in HTML before their consumers; the background worker uses `importScripts`. Update load order when adding a shared dependency, and do not introduce modules, TypeScript, React, or a bundler as part of unrelated work.

### Runtime invariant handling

- Do not hide logically impossible missing values with silent guard returns. Fail visibly when required DOM elements, message contracts, or internal state are broken.
- Guard returns are appropriate for valid runtime states such as no active tab, unsupported or unavailable browser APIs, and missing legacy settings that need defaults or migration. Keep those cases distinct from broken invariants.

### Helpers and services architecture

- Keep shared helpers in `service/` or `utils.js`
- Keep feature-specific logic in its context (`background.js`, `popup/`, `options/`)
- Prefer functional, stateless utilities over OOP-style service classes with internal state

### TODO ownership format

- When adding TODO comments, use the format: `// TODO(name) some text`.
- Prefer `name` from `git config user.name` of the user running the agent.
- If the name is unknown, ask the user once, then remember and reuse it consistently.
- When completing user requests, treat existing TODOs as informational only; do not execute or integrate them unless the user explicitly asks for that TODO work.

## Extension boundaries and compatibility

- Use `service/runtime.js`, `service/config.js`, and `service/tabs.js` for their existing responsibilities instead of duplicating messaging, settings requests, or tab-opening logic in popup/options code.
- For settings or message changes, inspect the popup/options callers, shared helper, background handler, storage normalization/migration, and import/export paths together. Preserve existing keys and payload fields unless the requested change explicitly requires a migration.
- Treat the background service worker as restartable: persistent configuration belongs in Chrome storage, and in-memory caches must be rebuilt through the existing loading flow. Preserve listener registration and initialization behavior.
- Preserve the established `chrome.scripting` CSS and `chrome.userScripts` JavaScript execution paths, including handling when user scripts are unavailable. Do not bypass execution boundaries or change manifest permissions as an incidental refactor.
- Keep bundled third-party code in `lib/` separate from application code. Do not hand-edit it unless the task explicitly targets it.

## Text and dependencies

- The popup and options currently use inline English text with no localization layer. Follow that convention; do not introduce a translation layer or another framework without a request.
- Do not update bundled libraries or add dependencies as part of unrelated work. For requested updates, verify release dates from an official registry, vendor release notes, or repository release page. Select the newest suitable version available for at least 30 days and explain when this excludes the latest version. A newer urgent security fix requires explicit approval for that specific update.

## Development workflow

### Context-first preparation

1. Before proposing an implementation plan or editing code, identify and read the closest existing implementations using the selection rules under **Pattern consistency**. For a small fix, inspect the surrounding implementation and a comparable usage when relevant.
2. Start with references supplied by the user. If none are supplied, or they do not cover all relevant parts of the task, search the repository yourself. Finding examples is the agent's responsibility; do not require the user to provide them.
3. Read the actual reference code and the shared components/helpers it relies on as needed. A filename, search result, or remembered pattern is not enough. For work spanning multiple layers, find a suitable reference for each affected extension context. Read `popup/default.js` and `options/default.js` for comparable controls and forms, the relevant `service/` helper for shared operations, and `background.js` for the corresponding handler.
4. Before substantial implementation, briefly identify the reference files and the patterns you will follow in a progress update. If no suitable reference exists after searching, state that finding and use the closest established building blocks without inventing an unnecessary framework.
5. After implementation, compare the changed code against the selected references and resolve unintended differences before handoff. Check structure, shared component/helper usage, behavior, naming, declaration order, and readability as well as formatting and automated checks.

### IDE tools and reviewability

- Prefer tools and MCP integrations connected to the IDE/editor currently used for the project so changes, diagnostics, and execution results are easy for the user to inspect there.
- JetBrains IDEs are the primary workflow. When available and suitable, prefer their IDE/MCP capabilities for symbol navigation, reference searches, refactoring, inspections, formatting, run configurations, and debugging. Confirm that the integration targets the correct project before using it.
- For edits, use IDE-aware tools when they provide useful refactoring or review support; otherwise use focused file patches that remain easy to review in the IDE's version control diff. Keep changes scoped and preserve unrelated work.
- When running builds or other validation, prefer the IDE's integrated terminal or run configurations when suitable so the user can inspect the output. Follow the validation requirements below regardless of the execution tool.
- Other IDEs/editors are supported too: use their equivalent integrations when available. If an IDE integration is unavailable or unsuitable, continue with standard file, search, shell, and debugger tools without requiring the user to switch editors.
- In the handoff, identify changed files and summarize validation results, including any IDE diagnostics or execution output the user should review. Do not assume external tool output is automatically visible in the IDE.

### Text search fallback

- For plain-text searches outside IDE tools, prefer `rg`/`rg --files`.
- If `rg` is unavailable or not working, use `grep`/`find` and continue.

### Validation

- Match validation to the changed area and fix issues introduced by the change. This repository has no package.json, configured formatter, TypeScript check, or npm build/lint script; do not invent those commands or add tooling just to match another project.
- Preserve existing formatting. If the project later configures a formatter or lint tooling, format changed supported files first and target lint checks to changed files.
- For application JavaScript changes, run `node --check` on each changed first-party JavaScript file. Syntax checks do not verify Chrome APIs or browser behavior.
- For manifest changes, parse `manifest.json` as JSON and verify the version format plus changed entry points, resource paths, and permissions.
- For behavior changes, reload the unpacked extension in Chromium and exercise the affected popup/options/background flow when a browser is available. Check both the extension-page console and service-worker console. Include storage persistence after reopening/reloading and CSS/JS injection when those flows change. Report manual checks that could not be performed.
- For instruction-only changes, review the diff and run `git diff --check`; browser checks and application syntax checks are unnecessary unless application files also change.
- For release packaging changes, inspect the zip entries and validate the existing packaging exclusions. Do not bump versions, create archives, or publish an extension unless requested.

### Handoff summary format

- After code changes and validation, include a short summary of changed files in your final response.
- Briefly name the reference implementations followed, explain intentional pattern departures, and report validation results and any checks that could not be performed. Keep the detail proportional to the change.
- Use plain text (non-clickable) project-relative file references only.
- For each relevant change block, include the starting line number using the `path:line` format (for example `options/default.js:120`).
- Do not use markdown file links for handoff file references.
- Keep this summary concise and focused on user-impacting or logic-impacting edits.
