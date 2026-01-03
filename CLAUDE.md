# Claude Instructions for Avatar Imaging CMS

## Deployment

**IMPORTANT: Never use `wrangler` directly. Always use `./wr` instead.**

This project uses branch-isolated deployments. See [DEPLOYMENT_README.md](./DEPLOYMENT_README.md) for full documentation.

### Quick Reference

```bash
# Deploy to current branch's environment
./wr deploy

# Apply migrations (will prompt for data sync)
./wr d1 migrations apply

# Sync data from production to sandbox
./wr sync-from-prod

# Any other wrangler command
./wr <command>
```

### How It Works

- `main` branch deploys to production
- All other branches deploy to isolated sandboxes
- Each branch gets its own D1 database and worker
- Sandbox environments are auto-created on first use

## Project Structure

- **Backend**: Cloudflare Workers + D1 (SQLite)
- **Frontend**: React + TypeScript (in `src/frontend/`)
- **API**: REST endpoints in `src/router/`

## Key Files

- `wrangler.main.toml` - Production configuration
- `wrangler.<branch>.toml` - Auto-generated sandbox configs
- `migrations/` - D1 database migrations
