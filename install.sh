#!/bin/sh
# Install meme on Linux, WSL or macOS:
#
#   curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh
#
# It downloads the single file for this system and CPU, checks it against the
# release's SHA256SUMS, puts it in ~/.local/bin as `meme`, adds that folder to
# your shell's PATH if it is not there yet, and runs `meme install`.
#
#   MEME_VERSION=v0.1.0      that release instead of the latest
#   MEME_INSTALL_DIR=<dir>   instead of ~/.local/bin
#   MEME_NO_MODIFY_PATH=1    leave the shell's startup file alone
#   MEME_FROM=<dir>          take the files from a folder (a build in dist/, say)
set -eu

REPO="jordonjill/meme"

say() { printf '%s\n' "$*"; }
fail() {
  printf 'meme install: %s\n' "$*" >&2
  exit 1
}

# The file for this system and CPU.
os=$(uname -s)
arch=$(uname -m)
case "$os" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  MINGW* | MSYS* | CYGWIN*) fail "on Windows, run this in PowerShell instead: irm https://github.com/$REPO/releases/latest/download/install.ps1 | iex" ;;
  *) fail "there is no meme for $os yet" ;;
esac
case "$arch" in
  x86_64 | amd64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) fail "there is no meme for $arch CPUs yet" ;;
esac
# A terminal under Rosetta on Apple silicon: the Mac runs the arm64 file natively.
if [ "$os" = darwin ] && [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then
  arch=arm64
fi
file="meme-$os-$arch"
# The x64 builds need AVX2; an older CPU gets the baseline build.
if [ "$arch" = x64 ]; then
  avx2=no
  if [ "$os" = linux ]; then
    # MEME_CPUINFO: another cpuinfo, for the tests.
    if grep -qw avx2 "${MEME_CPUINFO:-/proc/cpuinfo}" 2>/dev/null; then avx2=yes; fi
  elif sysctl -n machdep.cpu.leaf7_features 2>/dev/null | grep -qw AVX2; then
    avx2=yes
  fi
  if [ "$avx2" = no ]; then file="$file-baseline"; fi
fi

# Where the files come from. MEME_RELEASE_URL: somewhere else, for the tests.
if [ -n "${MEME_VERSION:-}" ]; then
  base="https://github.com/$REPO/releases/download/$MEME_VERSION"
else
  base="https://github.com/$REPO/releases/latest/download"
fi
base="${MEME_RELEASE_URL:-$base}"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

fetch() {
  if [ -n "${MEME_FROM:-}" ]; then
    cp "$MEME_FROM/$1" "$tmp/$1" 2>/dev/null || fail "there is no $1 in $MEME_FROM"
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL "$base/$1" -o "$tmp/$1" || fail "could not download $base/$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$base/$1" -O "$tmp/$1" || fail "could not download $base/$1"
  else
    fail "curl or wget is needed to download meme"
  fi
}

say "Downloading $file from ${MEME_FROM:-$base}"
fetch SHA256SUMS
fetch "$file"

want=$(awk -v f="$file" '$2 == f || $2 == "*" f { print $1 }' "$tmp/SHA256SUMS")
[ -n "$want" ] || fail "$file is not in SHA256SUMS"
if command -v sha256sum >/dev/null 2>&1; then
  got=$(sha256sum "$tmp/$file" | cut -d ' ' -f 1)
elif command -v shasum >/dev/null 2>&1; then
  got=$(shasum -a 256 "$tmp/$file" | cut -d ' ' -f 1)
else
  fail "sha256sum or shasum is needed to check the download"
fi
[ "$got" = "$want" ] || fail "$file does not match its checksum; nothing was installed"

dir="${MEME_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$dir"
chmod +x "$tmp/$file"
mv -f "$tmp/$file" "$dir/meme"
say "Installed $dir/meme"

# On PATH: through the startup file of the shell the user has, once.
case ":$PATH:" in
  *":$dir:"*) ;;
  *)
    if [ "${MEME_NO_MODIFY_PATH:-}" = 1 ]; then
      say "$dir is not on your PATH; add it to run meme by name."
    else
      case "${SHELL:-}" in
        */zsh) rc="$HOME/.zshrc" ;;
        */bash) if [ "$os" = darwin ]; then rc="$HOME/.bash_profile"; else rc="$HOME/.bashrc"; fi ;;
        *) rc="$HOME/.profile" ;;
      esac
      line="export PATH=\"$dir:\$PATH\""
      if ! grep -qsF "$line" "$rc"; then
        printf '\n# meme\n%s\n' "$line" >>"$rc"
        say "Added $dir to PATH in $rc. A new terminal finds meme; in this one, run: $line"
      fi
    fi
    ;;
esac

say ""
# Piped into sh, this script's input is the pipe. meme may have a question (install on the other side of
# WSL and Windows too?), which it asks only at a terminal: it gets the terminal when there is one.
if [ -t 1 ] && (: </dev/tty) 2>/dev/null; then
  "$dir/meme" install </dev/tty || fail "meme install did not finish; run it again: $dir/meme install"
else
  "$dir/meme" install || fail "meme install did not finish; run it again: $dir/meme install"
fi
