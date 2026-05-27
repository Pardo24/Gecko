#!/usr/bin/env bash
#
# Clone the running rootfs USB to an internal disk, re-randomise UUIDs,
# reinstall GRUB on the target, schedule a reboot.
#
# Called by gecko-ui.service via sudo. Prints JSON progress events to
# stdout, one per line. Exit code 0 on rebooting state, non-zero on failure.
#
# Usage: gecko-install-to-disk.sh <target-disk> <confirm-model-string>
#   $1  /dev/nvme0n1     — destination disk (will be WIPED)
#   $2  "Samsung SSD"    — must match the disk's MODEL — destruction guard

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo '{"stage":"failed","error":"must run as root"}'; exit 1; }
[[ $# -eq 2 ]] || { echo '{"stage":"failed","error":"usage: <target> <confirm>"}'; exit 1; }

TARGET="$1"
CONFIRM="$2"

emit() { printf '%s\n' "$1"; }
fail() { emit "{\"stage\":\"failed\",\"error\":$(jq -Rn --arg e "$1" '$e')}"; exit 1; }

# ── 1. Validation ──────────────────────────────────────────────────
[[ -b "$TARGET" ]] || fail "$TARGET is not a block device"
SOURCE_PART=$(findmnt -no SOURCE /)
SOURCE=${SOURCE_PART%[0-9]}     # /dev/sda3 → /dev/sda; for nvme: /dev/nvme0n1p3 → /dev/nvme0n1p (wrong!)
# Handle NVMe naming (which has a 'p' between disk and partition number)
case "$SOURCE_PART" in
  /dev/nvme*p[0-9]*|/dev/mmcblk*p[0-9]*) SOURCE=${SOURCE_PART%p[0-9]*} ;;
  *) SOURCE=${SOURCE_PART%[0-9]*} ;;
esac
[[ "$TARGET" != "$SOURCE" ]] || fail "target cannot be the source ($SOURCE)"

MODEL=$(lsblk -d -n -o MODEL "$TARGET" | tr -s ' ' | sed 's/[[:space:]]*$//')
[[ "$MODEL" == "$CONFIRM" ]] || fail "model mismatch: expected '$MODEL', got '$CONFIRM'"

# ── 2. Clone — dd with progress parsing ────────────────────────────
TOTAL=$(blockdev --getsize64 "$SOURCE")
emit "{\"stage\":\"cloning\",\"progress\":0,\"totalBytes\":$TOTAL,\"bytesCopied\":0}"

# dd writes "X bytes (Y MB, Z MiB) copied, T s, P MB/s" to stderr periodically.
# Pipe stderr to a parser that emits JSON updates.
(
  dd if="$SOURCE" of="$TARGET" bs=4M status=progress conv=fsync 2>&1 1>/dev/null
) | (
  while IFS= read -r line; do
    if [[ "$line" =~ ([0-9]+)\ bytes ]]; then
      copied=${BASH_REMATCH[1]}
      pct=$(( (copied * 99) / TOTAL ))
      emit "{\"stage\":\"cloning\",\"bytesCopied\":$copied,\"totalBytes\":$TOTAL,\"progress\":$pct}"
    fi
  done
)
sync

# ── 3. Re-randomise UUIDs ──────────────────────────────────────────
# dd produces an exact clone, including filesystem UUIDs. Two filesystems
# with the same UUID confuse the kernel at boot. We regenerate them on the
# target, then patch /etc/fstab and GRUB to match.
emit '{"stage":"reuuid","progress":99}'

# Re-read the partition table now that the target has fresh partitions
partprobe "$TARGET" 2>/dev/null || true
sleep 1

# Find the target's partitions in the expected order: bios_grub, ESP, rootfs
case "$TARGET" in
  /dev/nvme*|/dev/mmcblk*) PART_PREFIX="${TARGET}p" ;;
  *) PART_PREFIX="$TARGET" ;;
esac
ESP_PART="${PART_PREFIX}2"
ROOT_PART="${PART_PREFIX}3"
[[ -b "$ESP_PART" && -b "$ROOT_PART" ]] || fail "expected partitions ${ESP_PART} and ${ROOT_PART} not found"

tune2fs -U random "$ROOT_PART"
NEW_ROOT_UUID=$(blkid -s UUID -o value "$ROOT_PART")
NEW_ESP_UUID=$(blkid -s UUID -o value "$ESP_PART")

# ── 4. Mount target rootfs, patch fstab, reinstall GRUB ────────────
emit '{"stage":"grub","progress":99}'
MNT=$(mktemp -d)
mount "$ROOT_PART" "$MNT"
trap "umount -R '$MNT' 2>/dev/null || true; rmdir '$MNT' 2>/dev/null || true" EXIT

# Patch fstab to use the new UUIDs (otherwise next boot can't find rootfs)
sed -i -E "s|^UUID=[a-f0-9-]+(\s+/\s)|UUID=${NEW_ROOT_UUID}\1|" "$MNT/etc/fstab"
sed -i -E "s|^UUID=[A-F0-9-]+(\s+/boot/efi)|UUID=${NEW_ESP_UUID}\1|" "$MNT/etc/fstab"

# Bind-mount /dev /sys /proc and ESP, then chroot to reinstall GRUB on target
mount --bind /dev "$MNT/dev"
mount --bind /sys "$MNT/sys"
mount --bind /proc "$MNT/proc"
mkdir -p "$MNT/boot/efi"
mount "$ESP_PART" "$MNT/boot/efi"

chroot "$MNT" /usr/sbin/grub-install --target=x86_64-efi --efi-directory=/boot/efi \
       --bootloader-id=gecko --removable --no-nvram
chroot "$MNT" /usr/sbin/grub-install --target=i386-pc "$TARGET"
chroot "$MNT" /usr/sbin/update-grub

# Cleanup mounts (trap will catch leftovers)
umount "$MNT/boot/efi" "$MNT/proc" "$MNT/sys" "$MNT/dev"
umount "$MNT"
rmdir "$MNT"
trap - EXIT

# ── 5. Schedule reboot ─────────────────────────────────────────────
emit '{"stage":"rebooting","progress":100}'
# Give the UI ~5 s to render the "rebooting" state before pulling the rug out
( sleep 5 && systemctl reboot ) &
disown
exit 0
