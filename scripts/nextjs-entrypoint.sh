#!/bin/sh
# Merge this image's hashed CSS/JS into a shared volume so any replica can
# serve any recent build. Swarm's ingress mesh otherwise pairs new HTML
# with an old replica's /_next/static (or the reverse) and the page
# renders without styles.
#
# Each start records this image's files under .sparkvey-builds/<BUILD_ID>
# and deletes files no longer referenced by the last N recorded builds
# (NEXT_STATIC_KEEP_BUILDS, default 3). That covers start-first overlap
# plus a rollback without growing the volume forever.
set -eu

STATIC_SRC="${NEXT_STATIC_SRC:-/app/src/.next/static}"
STATIC_SHARE="${NEXT_STATIC_SHARE:-/mnt/next-static}"
BUILD_ID_FILE="${NEXT_BUILD_ID_FILE:-/app/src/.next/BUILD_ID}"
KEEP_BUILDS="${NEXT_STATIC_KEEP_BUILDS:-3}"
MANIFEST_DIR="${STATIC_SHARE}/.sparkvey-builds"
ORDER_FILE="${MANIFEST_DIR}/order"
PREEXISTING_ID="_pre-existing"

list_static_files() {
  dir="$1"

  (cd "$dir" && find . -type f ! -path './.sparkvey-builds/*' | sed 's|^\./||' | sort)
}

is_safe_relpath() {
  rel="$1"

  case "$rel" in
    ''|/*|*..*) return 1 ;;
  esac

  return 0
}

is_manifest_name() {
  case "$1" in
    lock|order) return 1 ;;
  esac

  return 0
}

has_recorded_build() {
  for path in "$MANIFEST_DIR"/*; do
    [ -f "$path" ] || continue
    if is_manifest_name "$(basename "$path")"; then
      return 0
    fi
  done

  return 1
}

append_build_order() {
  id="$1"
  tmp="$(mktemp)"

  if [ -f "$ORDER_FILE" ]; then
    grep -Fxv "$id" "$ORDER_FILE" > "$tmp" || true
    mv "$tmp" "$ORDER_FILE"
  else
    rm -f "$tmp"
  fi

  echo "$id" >> "$ORDER_FILE"
}

snapshot_untracked_files() {
  if has_recorded_build; then
    return 0
  fi

  if [ -z "$(list_static_files "$STATIC_SHARE")" ]; then
    return 0
  fi

  list_static_files "$STATIC_SHARE" > "${MANIFEST_DIR}/${PREEXISTING_ID}"
  append_build_order "$PREEXISTING_ID"
}

write_current_manifest() {
  list_static_files "$STATIC_SRC" > "${MANIFEST_DIR}/${BUILD_ID}"

  if [ ! -s "${MANIFEST_DIR}/${BUILD_ID}" ]; then
    echo "error: Next static directory is empty at ${STATIC_SRC}" >&2
    exit 1
  fi

  append_build_order "$BUILD_ID"
}

merge_current_build() {
  # In-place container restart: src is already the volume symlink. A copy
  # would dump .sparkvey-builds into itself. The existing manifest is fine.
  if [ -L "$STATIC_SRC" ]; then
    return 0
  fi

  snapshot_untracked_files
  cp -a "$STATIC_SRC"/. "$STATIC_SHARE"/
  write_current_manifest

  rm -rf "$STATIC_SRC"
  ln -s "$STATIC_SHARE" "$STATIC_SRC"
}

newest_manifests() {
  if [ ! -f "$ORDER_FILE" ]; then
    return 0
  fi

  tail -n "$KEEP_BUILDS" "$ORDER_FILE"
}

prune_old_builds() {
  keep_ids="$(mktemp)"
  keep_files="$(mktemp)"
  volume_files="$(mktemp)"
  stale_files="$(mktemp)"
  pruned=0

  newest_manifests > "$keep_ids"

  if [ ! -s "$keep_ids" ]; then
    echo "error: no static-share manifests to keep; refusing to prune" >&2
    rm -f "$keep_ids" "$keep_files" "$volume_files" "$stale_files"
    exit 1
  fi

  while IFS= read -r name; do
    [ -f "${MANIFEST_DIR}/${name}" ] || continue
    cat "${MANIFEST_DIR}/${name}"
  done < "$keep_ids" | sort -u > "$keep_files"

  if [ ! -s "$keep_files" ]; then
    echo "error: kept builds list no static files; refusing to prune" >&2
    rm -f "$keep_ids" "$keep_files" "$volume_files" "$stale_files"
    exit 1
  fi

  list_static_files "$STATIC_SHARE" > "$volume_files"
  comm -23 "$volume_files" "$keep_files" > "$stale_files"

  while IFS= read -r rel; do
    is_safe_relpath "$rel" || continue
    rm -f "${STATIC_SHARE}/${rel}"
    pruned=$((pruned + 1))
  done < "$stale_files"

  for path in "$MANIFEST_DIR"/*; do
    [ -f "$path" ] || continue
    name="$(basename "$path")"
    is_manifest_name "$name" || continue
    if ! grep -Fxq "$name" "$keep_ids"; then
      rm -f "$path"
    fi
  done

  if [ -f "$ORDER_FILE" ]; then
    kept_order="$(mktemp)"
    while IFS= read -r name; do
      if grep -Fxq "$name" "$keep_ids"; then
        echo "$name"
      fi
    done < "$ORDER_FILE" > "$kept_order"
    mv "$kept_order" "$ORDER_FILE"
  fi

  find "$STATIC_SHARE" -mindepth 1 -depth -type d -empty ! -path "${MANIFEST_DIR}*" -delete

  echo "next-static: kept $(wc -l < "$keep_ids" | tr -d ' ') builds, pruned ${pruned} files"

  rm -f "$keep_ids" "$keep_files" "$volume_files" "$stale_files"
}

case "$KEEP_BUILDS" in
  ''|*[!0-9]*) KEEP_BUILDS=3 ;;
esac

if [ "$KEEP_BUILDS" -lt 2 ]; then
  # A single kept build would delete the previous replica's files mid-roll.
  KEEP_BUILDS=2
fi

if [ ! -d "$STATIC_SRC" ]; then
  echo "error: Next static directory missing at ${STATIC_SRC}" >&2
  exit 1
fi

if [ ! -f "$BUILD_ID_FILE" ]; then
  echo "error: Next BUILD_ID missing at ${BUILD_ID_FILE}" >&2
  exit 1
fi

BUILD_ID="$(tr -d '[:space:]' < "$BUILD_ID_FILE")"

case "$BUILD_ID" in
  ''|*[!A-Za-z0-9._-]*|"$PREEXISTING_ID")
    echo "error: invalid Next BUILD_ID" >&2
    exit 1
    ;;
esac

if ! command -v flock >/dev/null 2>&1; then
  echo "error: flock is required to merge the shared static volume" >&2
  exit 1
fi

mkdir -p "$MANIFEST_DIR"

exec 9>"${MANIFEST_DIR}/lock"
flock 9

merge_current_build
prune_old_builds

if [ "$(id -u)" -eq 0 ]; then
  chown -R node:node "$STATIC_SHARE"
fi

flock -u 9
exec 9>&-

if [ "$(id -u)" -eq 0 ]; then
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
