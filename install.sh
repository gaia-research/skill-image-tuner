#!/usr/bin/env bash
#
# install.sh — Universal one-liner installer for the image-tuner agent skill.
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/gaia-research/skill-image-tuner/main/install.sh)
#
# Or from a local clone:
#   ./install.sh
#

set -euo pipefail

REPO="gaia-research/skill-image-tuner"
RAW="https://raw.githubusercontent.com/${REPO}/main"
SKILL_NAME="image-tuner"
INVOKE_TRIGGER="/image-tuner"

FILES=(
  "SKILL.md"
  "image_tuner.py"
  "README.md"
  "powered-by-gaia.svg"
)

# ---------------------------------------------------------------------------
# Colors (auto-disabled when stdout is not a TTY)
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; BLUE=$'\033[34m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=''; DIM=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; RESET=''
fi

say()  { printf '%s\n' "$*"; }
info() { printf '%s→%s %s\n' "$BLUE"   "$RESET" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN"  "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*"; }

# ---------------------------------------------------------------------------
# Parse Arguments
# ---------------------------------------------------------------------------
AUTO_CONFIRM=false
EXPLICIT_TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    -t|--target)
      EXPLICIT_TARGET="$2"
      shift 2
      ;;
    -h|--help)
      say "Usage: install.sh [-y|--yes] [-t|--target <dir>]"
      exit 0
      ;;
    *)
      warn "Unknown argument: $1"
      shift
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Locate Target Skills Directory
# ---------------------------------------------------------------------------
HERMES_ROOT="${HERMES_HOME:-$HOME/.hermes}"

if [ -n "$EXPLICIT_TARGET" ]; then
  TARGET_DIR="$EXPLICIT_TARGET"
  info "Using explicit target: ${BOLD}${TARGET_DIR}${RESET}"
else
  CANDIDATES=()
  [ -d "$HOME/.pi/agent/skills" ] && CANDIDATES+=("$HOME/.pi/agent/skills")
  [ -d ".agents/skills" ]         && CANDIDATES+=(".agents/skills")
  [ -d ".claude/skills" ]         && CANDIDATES+=(".claude/skills")
  [ -d ".cursor/skills" ]         && CANDIDATES+=(".cursor/skills")
  [ -d ".codex/skills" ]          && CANDIDATES+=(".codex/skills")
  [ -d "$HOME/.claude/skills" ]   && CANDIDATES+=("$HOME/.claude/skills")
  [ -d "$HOME/.codex/skills" ]    && CANDIDATES+=("$HOME/.codex/skills")
  { [ -d "$HERMES_ROOT/skills" ] || [ -f "$HERMES_ROOT/state.db" ]; } && CANDIDATES+=("$HERMES_ROOT/skills")
  [ -d "$HOME/.agents/skills" ]   && CANDIDATES+=("$HOME/.agents/skills")

  TARGET_DIR=""
  if [ "${#CANDIDATES[@]}" -eq 0 ]; then
    info "No existing skills directory found — creating ${BOLD}.agents/skills${RESET}"
    mkdir -p ".agents/skills"
    TARGET_DIR=".agents/skills"
  elif [ "${#CANDIDATES[@]}" -eq 1 ]; then
    TARGET_DIR="${CANDIDATES[0]}"
    info "Detected skills directory: ${BOLD}${TARGET_DIR}${RESET}"
  else
    if [ "$AUTO_CONFIRM" = true ] || [ ! -t 0 ]; then
      TARGET_DIR="${CANDIDATES[0]}"
      info "Auto-selecting default skills directory: ${BOLD}${TARGET_DIR}${RESET}"
    else
      say ""
      say "${BOLD}Multiple skills directories found. Where should ${SKILL_NAME} be installed?${RESET}"
      i=1
      for c in "${CANDIDATES[@]}"; do
        printf "  ${BOLD}%d)${RESET} %s\n" "$i" "$c"
        i=$((i + 1))
      done
      say ""
      printf "Select [1-%d]: " "${#CANDIDATES[@]}"
      read -r choice
      if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#CANDIDATES[@]}" ]; then
        warn "Invalid selection. Aborting."
        exit 1
      fi
      TARGET_DIR="${CANDIDATES[$((choice - 1))]}"
    fi
  fi
fi

INSTALL_DIR="${TARGET_DIR}/${SKILL_NAME}"

# ---------------------------------------------------------------------------
# Overwrite Handling
# ---------------------------------------------------------------------------
if [ -d "$INSTALL_DIR" ]; then
  if [ "$AUTO_CONFIRM" = true ] || [ ! -t 0 ]; then
    info "Replacing existing installation at ${BOLD}${INSTALL_DIR}${RESET}"
    rm -rf "$INSTALL_DIR"
  else
    warn "${BOLD}${INSTALL_DIR}${RESET} already exists."
    printf "Overwrite and update? [y/N]: "
    read -r reply
    case "$reply" in
      y|Y|yes|YES) rm -rf "$INSTALL_DIR" ;;
      *) info "Aborted. No changes made."; exit 0 ;;
    esac
  fi
fi

mkdir -p "$INSTALL_DIR"

# ---------------------------------------------------------------------------
# Fetch or Copy Files
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
IS_LOCAL=false
if [ -n "$SCRIPT_DIR" ] && [ -f "${SCRIPT_DIR}/SKILL.md" ] && [ -f "${SCRIPT_DIR}/image_tuner.py" ]; then
  IS_LOCAL=true
fi

for f in "${FILES[@]}"; do
  if [ "$IS_LOCAL" = true ] && [ -f "${SCRIPT_DIR}/${f}" ]; then
    info "Installing local ${f}..."
    cp "${SCRIPT_DIR}/${f}" "${INSTALL_DIR}/${f}"
  else
    info "Fetching ${f} from GitHub..."
    curl -fsSL "${RAW}/${f}" -o "${INSTALL_DIR}/${f}"
  fi
done

chmod +x "${INSTALL_DIR}/image_tuner.py"

# If local dist directory exists, copy it as well for full Vite capabilities
if [ "$IS_LOCAL" = true ] && [ -d "${SCRIPT_DIR}/dist" ]; then
  info "Copying built visual staging bundle (dist/)..."
  cp -r "${SCRIPT_DIR}/dist" "${INSTALL_DIR}/dist"
fi

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if ! grep -q '^name: image-tuner' "${INSTALL_DIR}/SKILL.md"; then
  warn "Downloaded SKILL.md does not contain expected frontmatter. Installation may be corrupt."
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  python3 -m py_compile "${INSTALL_DIR}/image_tuner.py" 2>/dev/null || true
fi

ok "Successfully installed to ${BOLD}${INSTALL_DIR}${RESET}"

# ---------------------------------------------------------------------------
# Requirements Check
# ---------------------------------------------------------------------------
say ""
say "${BOLD}Environment & Requirements Check${RESET}"

if command -v python3 >/dev/null 2>&1; then
  PYVER=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
  ok "python3 ${PYVER} available (CLI & zero-dependency tuner server ready)"
else
  warn "python3 not found — image_tuner.py requires Python 3.8+"
fi

if command -v node >/dev/null 2>&1; then
  NODEVER=$(node -v)
  ok "node ${NODEVER} available"
else
  info "node not found — optional for Vite dev server"
fi

# ---------------------------------------------------------------------------
# Post-Install Instructions
# ---------------------------------------------------------------------------
say ""
say "${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
say "${CYAN}║${RESET}  ${BOLD}${GREEN}Skill image-tuner is ready!${RESET}                                 ${CYAN}║${RESET}"
say "${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
say ""
say "  ${DIM}# From any agent conversation:${RESET}"
say "  ${BOLD}${INVOKE_TRIGGER}${RESET}                       ${DIM}# tune image framing${RESET}"
say "  ${BOLD}${INVOKE_TRIGGER} path/to/image.png${RESET}     ${DIM}# launch tuner with image preloaded${RESET}"
say ""
say "  ${DIM}# Directly from terminal:${RESET}"
say "  ${BOLD}python3 ${INSTALL_DIR}/image_tuner.py <path-to-image>${RESET}"
say ""
say "  ${DIM}# Headless CLI transform generator:${RESET}"
say "  ${BOLD}python3 ${INSTALL_DIR}/image_tuner.py export --zoom 1.25 --x 5 --y -10 --origin '50% 36%'${RESET}"
say ""
say "  ${DIM}# Inspect image dimensions & recommendations:${RESET}"
say "  ${BOLD}python3 ${INSTALL_DIR}/image_tuner.py inspect <path-to-image>${RESET}"
say ""
