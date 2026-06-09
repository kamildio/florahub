# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a freshly-scaffolded Node.js project (`npm init` default + IntelliJ/WebStorm `.idea` config). As of this writing it contains only an `index.js` entry point that prints a greeting. There is no source architecture, dependency set, test suite, or build pipeline yet — most of the project is still to be defined.

When the project gains real structure, update this file to document the architecture and the actual commands rather than the placeholders below.

## Commands

- Run the entry point: `node index.js`
- `npm test` is a placeholder that intentionally fails (`echo "Error: no test specified" && exit 1`). Replace it before relying on it.

## Notes

- `package.json` `main` is `index.js`; the package is `private` and currently has no dependencies.
- The staged copy of `package.json` still carries an unsubstituted `${PROJECT_NAME}` template value in `name` — set it to `florahub` (matching the working-tree copy) when committing.
