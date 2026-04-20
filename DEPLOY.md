# BMS Deployment Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x (use `nvm use 20`) |
| Cloud Foundry CLI (`cf`) | 8.x |
| MTA Build Tool (`mbt`) | 1.x |
| `@sap/cds-dk` | 9.x (in devDependencies) |

## Local development

```bash
nvm use 20
npm install
cds watch           # hot-reload, SQLite, dummy auth
```

## Run tests

```bash
npm test            # 21+ unit tests — must pass before deploying
```

## Build for BTP

```bash
# 1. Compile CDS → OData metadata + SQL DDL
npx cds build --production

# 2. Build the MTA archive
mbt build -t mta_archives/

# 3. Deploy to BTP (Cloud Foundry target must be set)
cf login -a <API_ENDPOINT> -o <ORG> -s <SPACE>
cf deploy mta_archives/BridgeManagement_1.0.0.mtar --retries 1
```

## Health check

After deploy, confirm the health probe responds:

```bash
curl https://<app-route>/health
# → {"status":"ok","ts":"...","version":"1.0.0","env":"production"}
```

BTP health probes are configured in `mta.yaml` under `health-check-type: http` pointing to `/health`.

## Environment / XSUAA

The app expects `VCAP_SERVICES` to contain an `xsuaa` service binding.
In the Cloud Foundry space, bind the `BridgeManagement-auth` service instance to the `srv` module:

```bash
cf bind-service BridgeManagement-srv BridgeManagement-auth
cf restage BridgeManagement-srv
```

## Rolling back

```bash
cf deploy mta_archives/BridgeManagement_<prev-version>.mtar --retries 1
```

Or revert via Git and rebuild:

```bash
git checkout draftv5
git revert HEAD
# rebuild and redeploy
```

## Branch workflow

| Branch | Purpose |
|--------|---------|
| `draftv5` | Active development — all commits go here |
| `main` / `master` | Production-tagged releases only |

Always pull before pushing:

```bash
git pull origin draftv5 --rebase
git push origin draftv5
```
