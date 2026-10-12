#!/usr/bin/env bash
# Deploy local `main` to the VPS without the server needing GitHub access:
# ship a git bundle, fast-forward, build into dist-next, swap, reload, health-check, roll back on failure.
set -euo pipefail

HOST="${DEPLOY_HOST:-tmslist-vps}"
APP_DIR="${DEPLOY_DIR:-/home/mdrpedia.com/public_html}"
BRANCH="${DEPLOY_BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4331/}"

cd "$(git rev-parse --show-toplevel)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Working tree has uncommitted changes" >&2; exit 1; }

remote() { ssh -o ConnectTimeout=15 "$HOST" "cd '$APP_DIR' && $*"; }
rgit() { remote "git -c safe.directory='$APP_DIR' $*"; }

SERVER_HEAD="$(rgit rev-parse HEAD)"
LOCAL_HEAD="$(git rev-parse "$BRANCH")"
[ "$SERVER_HEAD" != "$LOCAL_HEAD" ] || { echo "Server already at $LOCAL_HEAD"; exit 0; }
git merge-base --is-ancestor "$SERVER_HEAD" "$LOCAL_HEAD" || { echo "Server HEAD $SERVER_HEAD is not an ancestor of $BRANCH" >&2; exit 1; }

BUNDLE="$(mktemp -t mdrpedia).bundle"
git bundle create "$BUNDLE" "$SERVER_HEAD..$BRANCH"
scp -q "$BUNDLE" "$HOST:/tmp/mdrpedia-deploy.bundle"
rm -f "$BUNDLE"

LOCK_CHANGED="$(git diff --name-only "$SERVER_HEAD" "$LOCAL_HEAD" -- package-lock.json)"

ssh -o ConnectTimeout=15 "$HOST" bash -s -- "$APP_DIR" "$BRANCH" "$LOCAL_HEAD" "$HEALTH_URL" "${LOCK_CHANGED:+1}" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"; BRANCH="$2"; TARGET="$3"; HEALTH_URL="$4"; LOCK_CHANGED="${5:-}"
export PATH="/opt/node-v22.23.2-linux-x64/bin:$PATH"
cd "$APP_DIR"
OWNER="$(stat -c %U .)"
g() { git -c safe.directory="$APP_DIR" "$@"; }

PREV="$(g rev-parse HEAD)"
g checkout -- ecosystem.config.cjs 2>/dev/null || true
g fetch -q /tmp/mdrpedia-deploy.bundle "$BRANCH:refs/remotes/bundle/$BRANCH"
g merge -q --ff-only "$TARGET"
rm -f /tmp/mdrpedia-deploy.bundle

[ -n "$LOCK_CHANGED" ] && npm ci --no-audit --no-fund
npx prisma generate >/dev/null
rm -rf dist-next
npx astro build --outDir dist-next

rm -rf dist.prev
[ -d dist ] && mv dist dist.prev
mv dist-next dist
chown -R "$OWNER:$OWNER" dist node_modules .git 2>/dev/null || true

pm2 reload ecosystem.config.cjs --update-env >/dev/null
for i in $(seq 1 20); do
  sleep 2
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  [ "$code" = "200" ] && { pm2 save >/dev/null; echo "Deployed $TARGET (was $PREV)"; exit 0; }
done

echo "Health check failed ($code); rolling back to $PREV" >&2
g reset -q --hard "$PREV"
rm -rf dist && mv dist.prev dist
pm2 reload ecosystem.config.cjs --update-env >/dev/null
exit 1
REMOTE
