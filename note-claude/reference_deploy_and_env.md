---
name: reference-deploy-and-env
description: How to run the dev server and deploy.sh on this machine — Node/nvm PATH quirk and the two git remotes
metadata: 
  node_type: memory
  type: reference
  originSessionId: 07d583c3-b9a7-4c35-b3dd-d55634d5b921
---

**Node.js is installed via nvm**, not system-wide. Every fresh Bash shell in this environment does NOT have `node`/`npm` on PATH by default (nvm's PATH setup isn't sourced in non-interactive shells here). Always prefix commands with:
```
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
before `npm run dev`, `npm install`, `npx tsc`, or `bash deploy.sh` — otherwise you get "command not found" (exit 127). Installed version: node v24.18.0 / npm 11.16.0.

**Two git remotes, different purposes:**
- `origin` → `github.com/lokuramira/Pserv2.2.git` — Pietro's personal/backup repo, tracks `main`. Local `main` is routinely far ahead of `origin/main` (dozens of unpushed commits) — this is normal, not a problem to fix.
- `pser` → `github.com/pser-gestionale/app.git` — the **production** repo; GitHub Pages serves the live gestionale from its `gh-pages` branch.

**Deploying** (`bash deploy.sh` in repo root): builds the current working tree with `npm run build`, stashes everything, checks out local `gh-pages`, wipes tracked files, copies in `dist/`, commits, and **force-pushes to `pser`'s `gh-pages`** (this is what Rosalinda/colleagues actually use). Then returns to `main`, pops the stash, restores a hardcoded list of "critical" source files from `/tmp` backups as a safety net (the list is incomplete — doesn't cover every file, e.g. missed `src/types/index.ts`, `vite.config.ts`, `setup-supabase.sql` as of 2026-07-06), reinstalls `node_modules` from scratch, and restarts the vite dev server on port 3000.

**Before running deploy.sh:** commit current work to `main` first as a safety checkpoint — deploy.sh's own backup-file list doesn't cover everything, and a real commit is a much safer rollback point than relying on `git stash` + partial file copies.

**Known slow step:** `git checkout gh-pages` inside deploy.sh can take several minutes (observed once) since the repo lives on an external drive ("/Volumes/Disco 2 tera/") — this is normal disk I/O wait (process shows "U" state in `ps`), not a hang, as long as CPU time keeps slowly increasing across checks.

**gh-pages branch had `node_modules` accidentally committed** from a past deploy — deploy.sh's `git ls-files | xargs rm -f` step cleans this up automatically on each run.
