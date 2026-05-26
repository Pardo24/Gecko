#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }
IMG=/var/tmp/gecko-os-build/gecko-os.img
LOOP=$(losetup --show -fP "$IMG")
MNT=$(mktemp -d)
mount "${LOOP}p2" "$MNT"
mount --bind /dev "$MNT/dev"
mount --bind /proc "$MNT/proc"
cp /etc/resolv.conf "$MNT/etc/resolv.conf"
trap "umount '$MNT/dev' '$MNT/proc'; umount '$MNT'; rmdir '$MNT'; losetup -d '$LOOP'" EXIT

chroot "$MNT" /bin/bash -c "
  export DEBIAN_FRONTEND=noninteractive
  /usr/bin/apt-get install -y --no-install-recommends grub2-common 2>&1 | tail -5
"
echo "── grub-install present after grub2-common install? ──"
ls -la "$MNT/usr/sbin/grub-install" 2>&1
