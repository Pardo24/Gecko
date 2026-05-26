#!/usr/bin/env bash
# Install build dependencies for gecko-os/build.sh inside WSL Ubuntu.
# Run as root: `wsl -d Ubuntu --user root -- bash /mnt/c/.../install-deps.sh`
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root (wsl --user root)" >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  debootstrap \
  dosfstools \
  grub2-common \
  grub-pc-bin \
  grub-efi-amd64-bin \
  qemu-utils \
  qemu-system-x86 \
  parted \
  rsync \
  fdisk \
  cloud-image-utils
echo "Done."
