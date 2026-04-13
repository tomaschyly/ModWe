# Timoty Web Portal — Agent Instructions

These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides them.

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

## General coding conventions

### Code commenting

- Add comments for functions at minimum.
- Add additional comments around special or non-obvious logic.

### Pattern consistency

- In every change, follow established patterns from related contexts in this project (similar screen, feature, layer, or widget type).
- Prefer consistency with existing structure and naming over introducing a new approach.
- If multiple patterns exist, choose the one used in the closest relevant files unless the user explicitly asks otherwise.

### Helpers and services architecture

- Keep generic helpers in `src/service/`
- Keep helpers inside component files only when they are used exclusively by that component
- Write services in a functional, stateless style (function-based utilities), not OOP-style service classes with internal state

### TODO ownership format

- When adding TODO comments, use the format: `// TODO(name) some text`.
- Prefer `name` from `git config user.name` of the user running the agent.
- If the name is unknown, ask the user once, then remember and reuse it consistently.
- When completing user requests, treat existing TODOs as informational only; do not execute or integrate them unless the user explicitly asks for that TODO work.

## Development workflow

### Context-first preparation

- Before proposing a plan or starting code changes, review related files in the same domain/context to identify established patterns and structure.
- Use those nearby implementations as the primary reference for architecture, naming, state handling, and UI composition decisions.
- If patterns conflict, prefer the closest feature-equivalent example and call out the choice in your summary.

### Tool fallback (`rg`)

- Prefer `rg`/`rg --files` for search when available.
- If `rg` is not available or not working in the current environment, immediately fall back to `grep`/`find` and provide the user with concise `ripgrep` installation instructions for their OS, including at least one web reference.

### Validation

- After finishing code changes, run ESLint checks and resolve issues introduced by your changes before handoff.
- Prefer targeting linting to changed files first (for example `npx eslint src/path/a.tsx src/path/b.tsx`) unless there is a clear reason to run it on the whole project.

### Handoff summary format

- After code changes and validation, include a short summary of changed files in your final response.
- Use plain text (non-clickable) project-relative file references only.
- For each relevant change block, include the starting line number using the `path:line` format (for example `src/ui/components/devices/DeviceForm.tsx:890`).
- Do not use markdown file links for handoff file references.
- Keep this summary concise and focused on user-impacting or logic-impacting edits.
