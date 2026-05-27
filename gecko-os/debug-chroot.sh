#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }
IMG=/var/tmp/gecko-os-build/gecko-os.img
LOOP=$(losetup --show -fP "$IMG")
MNT=$(mktemp -d)
mount "${LOOP}p3" "$MNT"
trap "umount '$MNT'; rmdir '$MNT'; losetup -d '$LOOP'" EXIT

echo "── configure.sh full content ──"
cat -A "$MNT/tmp/configure.sh"
echo
echo "── stat configure.sh ──"
stat "$MNT/tmp/configure.sh"
