#!/usr/bin/env bash
# Build images with a unique tag and rolling-update the sparkvey stack.
# nextjs is cut over without overlapping builds (hashed CSS/JS 404 otherwise).
# Run on a Swarm manager from the repo root (or anywhere; we cd to the repo).
#
#   ./scripts/deploy-swarm.sh
#   ./scripts/deploy-swarm.sh --frontend
#   ./scripts/deploy-swarm.sh --skip-build
#   ./scripts/deploy-swarm.sh --force
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STACK_NAME="sparkvey"
NETWORK_NAME="sparkvey_net"
COMPOSE_FILE="docker-compose.yml"
WAIT_SECONDS=240
SKIP_BUILD=0
FORCE=0
FRONTEND_ONLY=0

usage() {
  cat <<'EOF'
Build Sparkvey images and rolling-update the Swarm stack.
nextjs scales to 1 replica for the image cutover so HTML and /_next/static
never come from two different builds (that serves a page with broken CSS).

Usage:
  ./scripts/deploy-swarm.sh [--frontend] [--skip-build] [--force] [--tag TAG]

  --frontend     Build and rolling-update nextjs only (backend/worker unchanged)
  --skip-build   Deploy the existing IMAGE_TAG (or --tag) without building
  --force        Force a roll even if the service spec looks unchanged
  --tag TAG      Image tag (default: git short SHA, or "latest")
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend|--frontend-only) FRONTEND_ONLY=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --force) FORCE=1; shift ;;
    --tag)
      IMAGE_TAG="${2:-}"
      if [[ -z "$IMAGE_TAG" ]]; then
        echo "error: --tag needs a value" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${IMAGE_TAG:-}" ]]; then
  if command -v git >/dev/null && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    IMAGE_TAG="$(git -C "$ROOT" rev-parse --short HEAD)"
  else
    IMAGE_TAG="latest"
  fi
fi

export IMAGE_TAG

hash_env_file() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$ROOT/.env" | awk '{ print substr($1, 1, 12) }'
  elif command -v shasum >/dev/null; then
    shasum -a 256 "$ROOT/.env" | awk '{ print substr($1, 1, 12) }'
  else
    echo "error: need sha256sum or shasum to version the Swarm env config" >&2
    exit 1
  fi
}

prune_old_env_configs() {
  local keep="$1"
  local name

  docker config ls --format '{{.Name}}' | grep -E '^sparkvey_env' | while read -r name; do
    if [[ "$name" == "$keep" ]]; then
      continue
    fi

    if docker config rm "$name" >/dev/null 2>&1; then
      echo "Removed unused config ${name}"
    fi
  done
}

read_env() {
  local key="$1"
  local line

  if [[ ! -f "$ROOT/.env" ]]; then
    return 0
  fi

  line="$(grep -E "^${key}=" "$ROOT/.env" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi

  printf '%s' "${line#*=}" | tr -d '\r' | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

require_swarm_manager() {
  if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -qx active; then
    echo "error: this node is not in an active Swarm" >&2
    exit 1
  fi

  if ! docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null | grep -qx true; then
    echo "error: this node is not a Swarm manager" >&2
    exit 1
  fi
}

ensure_network() {
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    return 0
  fi

  echo "Creating overlay network ${NETWORK_NAME}"
  docker network create -d overlay --attachable "$NETWORK_NAME"
}

build_nextjs() {
  local next_env next_ga4 next_cf

  next_env="$(read_env NEXT_PUBLIC_ENV)"
  next_ga4="$(read_env NEXT_PUBLIC_GA4_MEASUREMENT_ID)"
  next_cf="$(read_env NEXT_PUBLIC_CF_BEACON_TOKEN)"

  echo "Building sparkvey-nextjs:${IMAGE_TAG}"
  docker build \
    --target nextjs \
    --build-arg "NEXT_PUBLIC_ENV=${next_env:-production}" \
    --build-arg "NEXT_PUBLIC_GA4_MEASUREMENT_ID=${next_ga4}" \
    --build-arg "NEXT_PUBLIC_CF_BEACON_TOKEN=${next_cf}" \
    -t "sparkvey-nextjs:${IMAGE_TAG}" \
    -t sparkvey-nextjs:latest \
    .
}

build_images() {
  echo "Building sparkvey-backend:${IMAGE_TAG}"
  docker build \
    --target backend \
    -t "sparkvey-backend:${IMAGE_TAG}" \
    -t sparkvey-backend:latest \
    .

  echo "Building sparkvey-worker:${IMAGE_TAG}"
  docker build \
    --target worker \
    -t "sparkvey-worker:${IMAGE_TAG}" \
    -t sparkvey-worker:latest \
    .

  build_nextjs
}

# One Next build at a time. Two replicas with different hashed CSS/JS lets the
# mesh serve HTML from A and /_next/static from B — the page looks unstyled.
update_nextjs() {
  local service="${STACK_NAME}_nextjs"
  local extra_args=( "$@" )
  local desired

  if ! docker service inspect "$service" >/dev/null 2>&1; then
    echo "error: ${service} is not deployed yet; run a full deploy first" >&2
    exit 1
  fi

  desired="$(docker service inspect "$service" --format '{{.Spec.Mode.Replicated.Replicas}}')"

  if [[ "$desired" -gt 1 ]]; then
    echo "Scaling ${service} ${desired} → 1 so HTML and CSS stay on one build"
    docker service scale "${service}=1"
    wait_for_service "$service"
  fi

  echo "Updating ${service} to sparkvey-nextjs:${IMAGE_TAG}"
  if [[ ${#extra_args[@]} -gt 0 ]]; then
    docker service update \
      --image "sparkvey-nextjs:${IMAGE_TAG}" \
      --update-order stop-first \
      --update-parallelism 1 \
      "${extra_args[@]}" \
      "$service"
  else
    docker service update \
      --image "sparkvey-nextjs:${IMAGE_TAG}" \
      --update-order stop-first \
      --update-parallelism 1 \
      "$service"
  fi

  wait_for_service "$service"

  if [[ "$desired" -gt 1 ]]; then
    echo "Scaling ${service} 1 → ${desired}"
    docker service scale "${service}=${desired}"
    wait_for_service "$service"
  fi
}

deploy_frontend() {
  local service="${STACK_NAME}_nextjs"
  local update_args=()

  if [[ "$SKIP_BUILD" -eq 0 ]]; then
    build_nextjs
  else
    echo "Skipping image build (IMAGE_TAG=${IMAGE_TAG})"
  fi

  if [[ "$FORCE" -eq 1 ]]; then
    update_args+=( --force )
  fi

  update_nextjs "${update_args[@]}"

  echo "Frontend ${service} is rolled out (IMAGE_TAG=${IMAGE_TAG})"
  docker service ls --filter "name=${service}"
}

service_update_state() {
  docker service inspect "$1" --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}completed{{end}}' 2>/dev/null || echo "missing"
}

service_replica_counts() {
  local service="$1"
  local desired running

  desired="$(docker service inspect "$service" --format '{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo 0)"
  running="$(docker service ps "$service" --filter desired-state=running --format '{{.CurrentState}}' 2>/dev/null | grep -c '^Running' || true)"

  printf '%s %s' "$running" "$desired"
}

wait_for_service() {
  local service="$1"
  local deadline=$((SECONDS + WAIT_SECONDS))
  local state running desired

  echo "Waiting for ${service} to finish rolling (${WAIT_SECONDS}s)"

  while (( SECONDS < deadline )); do
    state="$(service_update_state "$service")"

    if [[ "$state" == "missing" ]]; then
      echo "error: service ${service} was not created" >&2
      return 1
    fi

    if [[ "$state" == "paused" || "$state" == "rollback_started" || "$state" == "rollback_completed" ]]; then
      echo "error: ${service} update ${state}" >&2
      docker service ps "$service" --no-trunc
      return 1
    fi

    read -r running desired <<<"$(service_replica_counts "$service")"

    if [[ "$state" == "completed" && "$running" == "$desired" && "$desired" != "0" ]]; then
      echo "${service} is ${running}/${desired}"
      return 0
    fi

    sleep 4
  done

  echo "error: timed out waiting for ${service}" >&2
  docker service ps "$service" --no-trunc
  return 1
}

require_swarm_manager

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "error: ${COMPOSE_FILE} not found in ${ROOT}" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "error: .env is missing (Swarm mounts it as a config)" >&2
  exit 1
fi

ensure_network

if [[ "$FRONTEND_ONLY" -eq 1 ]]; then
  deploy_frontend
  exit 0
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  build_images
else
  echo "Skipping image build (IMAGE_TAG=${IMAGE_TAG})"
fi

SPARKVEY_ENV_CONFIG="sparkvey_env_$(hash_env_file)"
export SPARKVEY_ENV_CONFIG

echo "Deploying stack ${STACK_NAME} with IMAGE_TAG=${IMAGE_TAG} ${SPARKVEY_ENV_CONFIG}"
docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"

if [[ "$FORCE" -eq 1 ]]; then
  echo "Forcing a rolling update"
  docker service update --force "${STACK_NAME}_backend" >/dev/null
  update_nextjs --force
  docker service update --force "${STACK_NAME}_worker" >/dev/null
fi

wait_for_service "${STACK_NAME}_backend"
wait_for_service "${STACK_NAME}_nextjs"
wait_for_service "${STACK_NAME}_worker"

prune_old_env_configs "$SPARKVEY_ENV_CONFIG"

echo "Stack ${STACK_NAME} is rolled out (IMAGE_TAG=${IMAGE_TAG} ${SPARKVEY_ENV_CONFIG})"
docker service ls --filter "label=com.docker.stack.namespace=${STACK_NAME}"
