# Copilot Cloud Agent Notes

## Repository Overview

This repository is a planning/specification workspace for a Seoul-focused local information product. The documented target stack is a Vue.js SPA front end, a FastAPI backend, SQLAlchemy ORM, and SQLite storage, with OpenAI-powered chat and map-based Seoul place discovery. The current repository state is doc-only: there is no application source tree yet.

## Current Repository Shape

Tracked files in the repo root and first level down are:

- `.gitignore`
- `.github/copilot-instructions.md`
- `docs/spec.md`
- `docs/api_spec.md`
- `docs/rdb_spec.md`

There is currently no `package.json`, no backend project file, no source directory, and no GitHub Actions workflow. Treat this repository as a specification-first project until code is added.

## What the Docs Say

- `docs/spec.md` defines the product scope: anonymous Seoul community CRUD, chatbot, map visualization, and deployment targets for Netlify and Render.
- `docs/api_spec.md` defines the intended API surface under `/api`, including posts, tours, and chat endpoints, plus the response envelope shape and request/response examples.
- `docs/rdb_spec.md` defines the SQLite schema for `Post` and `Tour` tables.

## Build, Test, and Validation State

There are no validated bootstrap, build, test, lint, or run scripts in the repository today. Do not assume a package manager or framework command exists. Before trying commands, inspect the repo for the actual entry points and scripts; if none exist, report that clearly instead of guessing.

What has been validated in this workspace:

- `Get-ChildItem -Recurse -File` lists only the five tracked files above.
- `rg` is not available in this environment, so use PowerShell file enumeration or VS Code search tools when you need inventory.

Validation guidance for future code changes:

- Always prefer repository-defined scripts if they appear later.
- If a frontend or backend project file is added later, run the documented install step before any build or test step.
- If CI workflows appear later, mirror the workflow order locally before changing code.
- If a command times out or fails, record the exact command, the failure mode, and the workaround in the repo docs or task notes.

## Working Rules for Agents

- Trust these instructions first and only search further if something here is missing or turns out to be wrong.
- Prefer the nearest authoritative spec file over broad code search when deciding behavior.
- Keep changes aligned with the documented architecture: Vue front end, FastAPI backend, SQLite persistence, SQLAlchemy ORM, OpenAI chat, and Seoul map/tour data.
- Do not add secrets to source control. `.gitignore` already excludes `.env` and common local build outputs.
- The repository currently has no implementation code to refactor, so avoid spending time searching for non-existent source modules or scripts.

## Layout Details That Matter

- `docs/` is the authoritative design surface right now; start here when you need product, API, or schema context.
- `.gitignore` already covers common Node/Vue, VS Code, Netlify, Vercel, and environment artifacts.
- No README or CONTRIBUTING file is present, so there is no additional project-wide workflow document to consult.

## If You Need More Context

Only broaden search if the docs do not answer the question. In that case, inspect the smallest nearby set of files first and update this note once actual build or test commands exist.
