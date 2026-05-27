#!/usr/bin/env bash
#
# Gecko OS image builder.
#
# Produces dist/gecko-os.img — a raw disk image bootable as a USB stick.
# Pipeline: create image → partition → debootstrap → install packages →
# install Docker → copy overlay → seed configs → install GRUB → cleanup.
#
# Run as root on a Linux host (or WSL2 on Windows). Not portable to macOS
# or native Windows (needs loop mounts, debootstrap, grub-install).
#
# Stage 0 status: skeleton only. Section markers indicate what still needs
# real implementation versus what's wired up.

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────
HERE="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${HERE}/dist"
# Build on a fast Linux filesystem; the dist artifact gets copied at the end.
# Critical on WSL where DIST_DIR lives on /mnt/c (DrvFs) and is ~30× slower
# for 4 GB random I/O.
WORK_DIR="${WORK_DIR:-/var/tmp/gecko-os-build}"
IMG_PATH="${WORK_DIR}/gecko-os.img"
IMG_SIZE_GB="${IMG_SIZE_GB:-4}"          # target image size (GB) — expandable on first boot
DEBIAN_SUITE="${DEBIAN_SUITE:-bookworm}"  # Debian 12
DEBIAN_MIRROR="${DEBIAN_MIRROR:-http://deb.debian.org/debian}"
LOOP_DEV=""
MNT_DIR=""

log() { echo -e "\033[1;32m[build]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

# ── Cleanup trap ─────────────────────────────────────────────────────
# Unmount everything and detach the loop device, even on error.
cleanup() {
  local code=$?
  if [[ -n "${MNT_DIR}" && -d "${MNT_DIR}" ]]; then
    umount -R "${MNT_DIR}" 2>/dev/null || true
    rmdir "${MNT_DIR}" 2>/dev/null || true
  fi
  if [[ -n "${LOOP_DEV}" ]]; then
    losetup -d "${LOOP_DEV}" 2>/dev/null || true
  fi
  exit $code
}
trap cleanup EXIT INT TERM

# ── Preflight ────────────────────────────────────────────────────────
preflight() {
  log "Preflight checks"
  [[ $EUID -eq 0 ]] || { err "Run as root (sudo ./build.sh)"; exit 1; }
  for cmd in debootstrap losetup mkfs.ext4 mkfs.vfat grub-install qemu-img; do
    command -v "$cmd" >/dev/null || { err "Missing: $cmd"; exit 1; }
  done
  mkdir -p "${WORK_DIR}" "${DIST_DIR}"
  # Build on a real Linux filesystem (not DrvFs). Required for chroot, perms,
  # and acceptable I/O perf.
  case "$(stat -f -c %T "${WORK_DIR}" 2>/dev/null)" in
    9p|drvfs|cifs|vboxsf) err "WORK_DIR=${WORK_DIR} is on a non-native FS (${_}). Set WORK_DIR to a path on a Linux filesystem."; exit 1 ;;
  esac
}

# ── 1. Create empty image + partition ────────────────────────────────
create_image() {
  log "Creating ${IMG_SIZE_GB} GB sparse image"
  qemu-img create -f raw "${IMG_PATH}" "${IMG_SIZE_GB}G"

  log "Partitioning (GPT: 1 MB BIOS Boot + 512 MB ESP + rest ext4)"
  # BIOS Boot Partition (~1 MB, no FS) is required for GRUB BIOS legacy boot
  # on GPT-partitioned disks. Without it, grub-install --target=i386-pc fails
  # with "will not proceed with blocklists".
  parted -s "${IMG_PATH}" \
    mklabel gpt \
    mkpart bios_grub 1MiB 2MiB \
    set 1 bios_grub on \
    mkpart ESP fat32 2MiB 514MiB \
    set 2 esp on \
    mkpart rootfs ext4 514MiB 100%
}

# ── 2. Attach loop device + format ───────────────────────────────────
attach_loop() {
  LOOP_DEV=$(losetup --show -fP "${IMG_PATH}")
  log "Loop device: ${LOOP_DEV} (p1=bios_grub, p2=ESP, p3=rootfs)"
  # p1 is the BIOS Boot Partition — no filesystem, GRUB embeds its core
  # image directly into the raw sectors via grub-install --target=i386-pc.
  mkfs.vfat -F32 -n GECKO_ESP "${LOOP_DEV}p2" >/dev/null
  mkfs.ext4 -L GECKO_ROOT -F "${LOOP_DEV}p3" >/dev/null
}

# ── 3. Mount + debootstrap ───────────────────────────────────────────
debootstrap_base() {
  MNT_DIR=$(mktemp -d)
  mount "${LOOP_DEV}p3" "${MNT_DIR}"
  mkdir -p "${MNT_DIR}/boot/efi"
  mount "${LOOP_DEV}p2" "${MNT_DIR}/boot/efi"

  log "debootstrap Debian ${DEBIAN_SUITE} (this takes a while...)"
  debootstrap --variant=minbase --arch=amd64 \
    --include=systemd,systemd-sysv,dbus,locales,sudo,openssh-server,ca-certificates,curl,gnupg \
    "${DEBIAN_SUITE}" "${MNT_DIR}" "${DEBIAN_MIRROR}"

  # Bind-mount system stuff into the chroot for the next steps.
  mount --bind /dev "${MNT_DIR}/dev"
  mount --bind /dev/pts "${MNT_DIR}/dev/pts"
  mount --bind /sys "${MNT_DIR}/sys"
  mount --bind /proc "${MNT_DIR}/proc"

  # DNS — without this, apt-get can't resolve anything inside the chroot.
  # We rewrite this on first boot via systemd-resolved.
  cp /etc/resolv.conf "${MNT_DIR}/etc/resolv.conf"

  # Stop dpkg from starting services during install — we're building an image,
  # not running it. Removed at the end of configure_chroot.
  cat > "${MNT_DIR}/usr/sbin/policy-rc.d" <<'EOF'
#!/bin/sh
exit 101
EOF
  chmod +x "${MNT_DIR}/usr/sbin/policy-rc.d"
}

# ── 4. Inside chroot: install packages + Docker + configure ──────────
configure_chroot() {
  log "Configuring chroot"

  # APT packages from the list file (one per line, comments allowed both
  # whole-line and inline). The sed strips inline `# ...` so package names
  # aren't followed by `#` which bash would interpret as a shell comment
  # when the variable is expanded into the install command.
  # The `tr -d '\r'` strips Windows CRLF — without it, apt sees package
  # names with a trailing \r and reports "Unable to locate package".
  local pkgs
  pkgs=$(sed -E 's/[[:space:]]*#.*$//; /^[[:space:]]*$/d' "${HERE}/packages.list" | tr -d '\r' | tr '\n' ' ')

  cat > "${MNT_DIR}/tmp/configure.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Generate locales
echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
echo "ca_ES.UTF-8 UTF-8" >> /etc/locale.gen
echo "es_ES.UTF-8 UTF-8" >> /etc/locale.gen
locale-gen
update-locale LANG=en_US.UTF-8

# Hostname
echo "gecko" > /etc/hostname
echo "127.0.1.1 gecko" >> /etc/hosts

# APT update + install. Order matters: must come before useradd because
# some groups ('input', 'render', etc.) are created by package postinst
# scripts. (Heredoc has \$ expansion enabled — do not use backticks in
# comments here, they would be executed.)
#
# `apt-cache gencaches` rebuilds /var/cache/apt/pkgcache.bin explicitly.
# Without it, apt-get install can race with the post-update cache write
# in a fresh chroot and reports "Unable to locate package" even though
# apt-cache search can find the packages on the same filesystem.
apt-get update
apt-cache gencaches
apt-get install -y --no-install-recommends ${pkgs}

# Docker (official repo)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian ${DEBIAN_SUITE} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Default user (password set on first boot via wizard).
# Groups: sudo (admin), docker (manage stack), video+input+tty (Xorg kiosk).
useradd -m -G sudo,docker,video,input,tty -s /bin/bash gecko
passwd -d gecko    # passwordless until wizard sets one (locked-down via PAM)
mkdir -p /etc/sudoers.d
echo "gecko ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/gecko

# Mask getty on tty1 — gecko-kiosk.service takes over tty1 for Xorg.
# Without this, getty and our Xorg fight over the TTY at boot.
systemctl mask getty@tty1.service

# Enable services we own (skip silently if not present yet — Stage 1 may
# ship without the kiosk service unit until the display stack is added)
systemctl enable docker
systemctl enable ssh
for unit in gecko-first-boot.service gecko-ui.service gecko-kiosk.service; do
  if [[ -f /etc/systemd/system/\${unit} ]]; then
    systemctl enable \${unit}
  fi
done

# Default to graphical target so kiosk starts at boot (Stage 2+)
systemctl set-default graphical.target

# Ownership: gecko user owns /opt/gecko (UI service runs as gecko)
chown -R gecko:gecko /opt/gecko

# Cleanup APT
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

  chmod +x "${MNT_DIR}/tmp/configure.sh"
  chroot "${MNT_DIR}" /tmp/configure.sh
  rm "${MNT_DIR}/tmp/configure.sh"

  # Remove the no-start policy now that install is done. Services will run
  # normally when the image boots on real hardware.
  rm -f "${MNT_DIR}/usr/sbin/policy-rc.d"
}

# ── 5. Copy overlay + seeds ──────────────────────────────────────────
copy_overlay() {
  log "Copying overlay files"
  cp -a "${HERE}/overlay/." "${MNT_DIR}/"

  log "Copying Docker stack into /opt/gecko/stack"
  mkdir -p "${MNT_DIR}/opt/gecko/stack"
  cp -a "${HERE}/../stack/." "${MNT_DIR}/opt/gecko/stack/"

  log "Copying seeded service configs"
  if [[ -d "${HERE}/seeds" ]]; then
    mkdir -p "${MNT_DIR}/opt/gecko/seeds"
    cp -a "${HERE}/seeds/." "${MNT_DIR}/opt/gecko/seeds/"
  fi

  # UI bundles — built on the host by `npm run build:headless`. Renderer
  # is served as static; server.js is the bundled Express entry point.
  # node_modules NOT needed — esbuild inlined everything via --bundle.
  local renderer_dir="${HERE}/../dist"
  local server_bundle="${HERE}/../dist-server/server.js"
  if [[ -f "${server_bundle}" && -d "${renderer_dir}" ]]; then
    log "Copying UI bundles into /opt/gecko/ui"
    mkdir -p "${MNT_DIR}/opt/gecko/ui/renderer"
    cp -a "${renderer_dir}/." "${MNT_DIR}/opt/gecko/ui/renderer/"
    cp "${server_bundle}" "${MNT_DIR}/opt/gecko/ui/server.js"
  else
    err "UI bundles missing. Run 'npm run build:headless' before build.sh."
    err "Expected: ${renderer_dir}/ and ${server_bundle}"
    exit 1
  fi

  # Restore Unix permissions lost when sources live on /mnt/c (DrvFs doesn't
  # preserve them). Scripts → +x; service unit files → 644 (systemd complains
  # if they're world-writable or executable).
  log "Restoring executable bits on scripts"
  find "${MNT_DIR}/opt/gecko" "${MNT_DIR}/usr/local/bin" \
    \( -name "*.sh" -o -name "*.py" \) \
    -exec chmod +x {} \; 2>/dev/null || true
  find "${MNT_DIR}/etc/systemd/system" -name "*.service" \
    -exec chmod 644 {} \; 2>/dev/null || true
}

# ── 6. fstab + GRUB install ──────────────────────────────────────────
install_bootloader() {
  log "Writing /etc/fstab"
  local esp_uuid root_uuid
  esp_uuid=$(blkid -s UUID -o value "${LOOP_DEV}p2")
  root_uuid=$(blkid -s UUID -o value "${LOOP_DEV}p3")
  cat > "${MNT_DIR}/etc/fstab" <<EOF
UUID=${root_uuid} /          ext4 defaults,noatime 0 1
UUID=${esp_uuid}  /boot/efi  vfat umask=0077       0 2
EOF

  log "Configuring GRUB defaults (serial + video console)"
  cat > "${MNT_DIR}/etc/default/grub" <<'EOF'
GRUB_DEFAULT=0
GRUB_TIMEOUT=2
GRUB_DISTRIBUTOR="Gecko OS"
GRUB_CMDLINE_LINUX_DEFAULT="quiet console=tty0 console=ttyS0,115200n8"
GRUB_CMDLINE_LINUX=""
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"
EOF

  log "Installing GRUB (BIOS + UEFI hybrid)"
  # Use full paths — chroot's inherited PATH may not include /usr/sbin
  chroot "${MNT_DIR}" /usr/sbin/grub-install --target=x86_64-efi \
    --efi-directory=/boot/efi --bootloader-id=gecko --removable --no-nvram
  chroot "${MNT_DIR}" /usr/sbin/grub-install --target=i386-pc "${LOOP_DEV}"
  chroot "${MNT_DIR}" /usr/sbin/update-grub
}

# ── Main ─────────────────────────────────────────────────────────────
finalize() {
  log "Detaching loop, copying image to dist/"
  umount -R "${MNT_DIR}"
  rmdir "${MNT_DIR}"
  MNT_DIR=""
  losetup -d "${LOOP_DEV}"
  LOOP_DEV=""

  local final="${DIST_DIR}/gecko-os.img"
  log "Copying to ${final} (this may be slow on /mnt/c — be patient)"
  cp "${IMG_PATH}" "${final}"
  ls -lh "${final}"
}

main() {
  preflight
  create_image
  attach_loop
  debootstrap_base
  copy_overlay        # must come before configure_chroot so systemctl can
                      # enable the units we ship
  configure_chroot
  install_bootloader
  finalize
  log "Done — output: ${DIST_DIR}/gecko-os.img"
  log "Flash to USB: sudo dd if=${DIST_DIR}/gecko-os.img of=/dev/sdX bs=4M status=progress"
}

main "$@"
