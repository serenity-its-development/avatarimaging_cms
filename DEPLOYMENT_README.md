# Branch-Isolated Sandbox Deployments

This project uses a branch-based deployment system that automatically isolates each git branch into its own sandbox environment. This prevents accidental deployments to production and allows multiple developers to work on separate features without conflicts.

## Overview

- **No `wrangler.toml`** - Running bare `wrangler deploy` will fail (safe by default)
- **`wrangler.main.toml`** - Production configuration (used only on `main` branch)
- **`wrangler.<branch-slug>.toml`** - Per-branch sandbox configs (auto-generated)

## The `./wr` Wrapper Script

All wrangler commands should be run through the `./wr` wrapper script. This script:

1. Detects your current git branch
2. Slugifies the branch name (e.g., `claude/feature-x` → `claude-feature-x`)
3. Determines the correct config:
   - `main` branch → `wrangler.main.toml`
   - Any other branch → `wrangler.<slug>.toml`
4. Auto-creates sandbox infrastructure if missing:
   - Creates a new D1 database
   - Generates a wrangler config from template
5. Passes commands to wrangler with the correct `-c <config>` flag

## Commands

### Deploy

```bash
./wr deploy
```

Deploys to the current branch's environment:
- On `main`: deploys to production
- On feature branches: deploys to sandbox at `https://avatarimaging-cms-<slug>.workers.dev`

### Apply Migrations

```bash
./wr d1 migrations apply
```

Applies database migrations to the branch's D1 database. After migrations complete, you'll be prompted:

```
Sync data from production?
  1) Full replace (INSERT) - overwrites existing data
  2) Incremental (INSERT OR IGNORE) - keeps existing data
  3) Skip - don't sync data
```

### Sync Data from Production

```bash
./wr sync-from-prod
```

Copies data from production database to the sandbox. Prompts for sync mode:

- **Full replace** (`INSERT`) - Completely replaces sandbox data with production data
- **Incremental** (`INSERT OR IGNORE`) - Only adds rows that don't already exist

### Other Commands

Any other wrangler command is passed through with the correct config:

```bash
./wr tail              # Tail logs
./wr d1 execute ...    # Run SQL
./wr secret put ...    # Set secrets
```

## Safety Features

1. **No default config** - `wrangler deploy` without `./wr` fails because there's no `wrangler.toml`
2. **Branch isolation** - Each branch gets its own worker name and D1 database
3. **Automatic detection** - Script always uses the correct config for your branch
4. **Production protection** - Production only deploys from `main` branch

## File Structure

```
wrangler.main.toml              # Production config (committed)
wrangler.<branch-slug>.toml     # Sandbox configs (gitignored or committed per preference)
wr                              # Wrapper script
```

## First-Time Setup on a Branch

When you first run `./wr` on a new branch, the script will:

1. Detect that no config exists for this branch
2. Create a new D1 database named `avatarimaging-crm-db-<slug>`
3. Generate `wrangler.<slug>.toml` with the new database ID
4. Proceed with your command

After this, run migrations and optionally sync data:

```bash
./wr d1 migrations apply
# Follow prompts to sync production data
```

## Cleanup

To remove a sandbox environment:

1. Delete the D1 database: `wrangler d1 delete avatarimaging-crm-db-<slug>`
2. Delete the worker: `wrangler delete avatarimaging-cms-<slug>`
3. Delete the config file: `rm wrangler.<slug>.toml`

## Troubleshooting

### "wrangler.main.toml not found"

You're on the `main` branch but the production config is missing. This file should be committed to the repository.

### "Cannot sync from prod to prod"

You tried to run `./wr sync-from-prod` on the `main` branch. This command is only for sandbox branches.

### Database creation failed

Check your Cloudflare authentication:
```bash
wrangler whoami
wrangler login
```
