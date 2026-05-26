#!/usr/bin/env bash
for c in debootstrap losetup mkfs.ext4 mkfs.vfat grub-install qemu-img qemu-system-x86_64 parted; do
  printf "%-25s" "$c"
  if command -v "$c" >/dev/null 2>&1; then echo OK; else echo MISSING; fi
done
