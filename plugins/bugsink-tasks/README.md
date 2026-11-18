# Bugsink plugin

Orca plugin for browsing [Bugsink](https://www.bugsink.com/) projects and issues.

## Setup

1. Load the plugin folder in Orca (`orca plugin dev load .` from this directory, or add it as a development folder).
2. Check **Settings → Plugins → Bugsink**: `Bugsink URL` and `API token` are prefilled for the local server and can be changed.

## What it does

- Lists Bugsink projects and their issues (canonical API).
- Shows issue details (type, value, state, counts, first/last seen).

Implementation: a trusted-worker plugin with a components panel (`src/panel.tsx`) and a worker (`worker/main.mjs`) that calls the Bugsink API.
