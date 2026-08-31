#!/bin/sh
# Merge this image's hashed CSS/JS into a shared volume so any replica can
# serve any recent build. Swarm's ingress mesh otherwise pairs new HTML
# with an old replica's /_next/static (or the reverse) and the page
# renders without styles.
set -eu

STATIC_SRC="/app/src/.next/static"
STATIC_SHARE="/mnt/next-static"

if [ ! -d "$STATIC_SRC" ]; then
  echo "error: Next static directory missing at ${STATIC_SRC}" >&2
  exit 1
fi

mkdir -p "$STATIC_SHARE"
cp -a "$STATIC_SRC"/. "$STATIC_SHARE"/
chown -R node:node "$STATIC_SHARE"

rm -rf "$STATIC_SRC"
ln -s "$STATIC_SHARE" "$STATIC_SRC"

if [ "$(id -u)" -eq 0 ]; then
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
