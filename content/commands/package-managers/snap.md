---
slug: snap
name: snap
aliases: []
category: package-managers
tags: [linux, canonical, ubuntu, packages, containers, desktop, server]
difficulty: beginner
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install snap package'
  - 'remove snap application'
  - 'update snap packages'
  - 'manage snap permissions'
  - 'revert snap update'
relatedCommands: [flatpak, apt, systemctl]
alternatives: [flatpak, apt]
status: draft
---

## What is it?

`snap` is a software deployment and package management system developed by Canonical (the makers of Ubuntu). It installs "snaps"—containerized software packages that bundle an application alongside all its dependencies. Snaps run in tightly controlled sandbox environments utilizing systemd mounts and AppArmor profiles. Unlike Flatpak, which is strictly desktop-focused, `snap` is engineered to handle both graphical desktop applications and headless server daemons (like databases or cloud CLIs) across diverse Linux distributions.

## Why does it exist?

Traditional Linux packaging (`apt`/`.deb`) is highly coupled to the operating system's release cycle. An application built for Ubuntu 20.04 might break on 22.04 due to underlying `glibc` or Python updates. Developers hated maintaining PPA repositories. Canonical built `snap` to decouple the application from the OS. By bundling the exact library versions the developer compiled against into a massive, read-only, compressed SquashFS image, the application is guaranteed to run flawlessly regardless of the host OS. Furthermore, `snap` enforces automatic, silent background updates, ensuring IoT devices, servers, and desktops are always running the latest patched software without user intervention.

## Syntax

```bash
snap [OPTIONS] <command>
```

## Flags

| Command / Flag        | Description                                                                                                                                                 | Example                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `install`             | Downloads and installs a snap from the global Snap Store.                                                                                                   | `snap install certbot`                  |
| `remove`              | Uninstalls a snap. By default, it takes a snapshot of the app's user data and retains it for 31 days before final deletion.                                 | `snap remove firefox`                   |
| `refresh`             | Manually triggers an update check for all installed snaps, pulling down binary deltas and restarting services if needed.                                    | `snap refresh`                          |
| `find`                | Searches the global Snap Store for packages matching a specific string or description.                                                                      | `snap find kubernetes`                  |
| `list`                | Outputs a formatted table of all currently installed snaps, including their version, revision number, tracking channel, and publisher.                      | `snap list`                             |
| `info`                | Displays detailed metadata about a specific snap, including its description, publisher, and the exact versions available across different release channels. | `snap info docker`                      |
| `revert`              | Instantly rolls an installed snap back to the previous version and restores its data snapshot, recovering from broken updates.                              | `snap revert vlc`                       |
| `connect`             | Manually grants an application access to a restricted system resource (an "interface" like audio, webcam, or raw network).                                  | `snap connect obs:camera`               |
| `--classic`           | (Flag for `install`) Downgrades security. Bypasses the strict AppArmor sandbox, granting the application full access to the host filesystem and libraries.  | `snap install code --classic`           |
| `--channel=<channel>` | (Flag for `install`) Opts into a specific release track (e.g., `latest/edge`, `1.20/stable`) instead of the default `latest/stable` branch.                 | `snap install go --channel=1.20/stable` |

## Examples

```bash
sudo snap install microk8s --classic
```

> A common developer workflow. Installs the `microk8s` Kubernetes distribution. The `--classic` flag is absolutely mandatory here; a Kubernetes cluster cannot function inside a locked-down AppArmor sandbox, as it needs raw access to kernel namespaces, cgroups, and the host's `/var/lib` mount points.

```bash
snap info lxd
```

> Investigates release channels. The output displays the standard metadata, but crucially prints a table of "channels" (e.g., `5.0/stable`, `latest/candidate`, `latest/edge`). This allows an administrator to purposefully select an LTS branch rather than blindly installing the bleeding-edge default.

```bash
sudo snap revert nextcloud
```

> The ultimate safety net. Canonical enforces silent automatic updates for snaps. If an overnight update to the `nextcloud` server introduces a fatal database bug, the administrator runs this command. `snapd` unmounts the new version, remounts the old SquashFS image, and seamlessly restarts the systemd services, instantly restoring functionality.

```bash
snap connections spotify
```

> Audits sandboxed permissions. Outputs a table displaying which "plugs" (application requests) are connected to which "slots" (system resources). For example, it might show that Spotify is connected to `pulseaudio` (allowing sound) but disconnected from `camera` (denying video).

## Real-World Scenarios

**Managing Headless Server Dependencies**

```bash
sudo snap install core
sudo snap install aws-cli --classic
sudo snap install certbot --classic
```

> In modern Ubuntu Server deployments, native `apt` packages for cloud CLIs and Let's Encrypt (`certbot`) are frequently outdated or deprecated. Administrators deploy these tools universally using `snap`. Because the tools bundle Python environments, they don't corrupt the host OS's system Python, preventing brutal dependency collisions during major OS upgrades.

**Controlling Unwanted Automated Restarts**

```bash
sudo snap set system refresh.timer=sun,02:00-04:00
```

> By default, `snapd` checks for and installs updates four times a day. For mission-critical server daemons (like a heavily utilized database or proxy), an automatic update instantly restarts the service, causing sudden connection drops in the middle of a Tuesday afternoon. System administrators use this command to strictly constrain update evaluations to a 2-hour maintenance window on Sunday mornings.

## When should it NOT be used?

- **Cold-Start Sensitive Environments:** **Do not use snaps for CLI tools that must start instantly.** Because a snap is a compressed SquashFS image, executing a tool requires the kernel to decompress the binary on the fly. Running a snappy Python script or node CLI tool often incurs a 500ms to 2-second startup penalty, heavily degrading the user experience for tools like `aws-cli` or `kubectl` when executed repeatedly in bash loops.
- **Non-Systemd Linux Distributions:** **Snap requires `systemd`.** It heavily relies on systemd mount units and cgroups. If you are running Alpine Linux, Artix (with OpenRC), or WSL1 on Windows, `snapd` will not function. You must use native packages or AppImages.
- **High-Density Storage Servers:** Every snap retains at least one previous version of its massive `.snap` SquashFS file for rollback purposes. Installing 10 heavily bundled applications (like IDEs or browsers) can easily consume 20GB+ of root partition space, as they do not share libraries with the host OS.

## Alternatives

- **`flatpak`:** **Best for desktop GUI apps.** Vastly superior for graphical applications due to its reliance on standard XDG Portals rather than Canonical's proprietary AppArmor bindings.
- **Native `apt` / `dnf`:** **Best for system libraries and speed.** Native binaries link directly to system libraries, consuming fractions of the disk space and launching in milliseconds.
- **Docker:** **Best for robust server daemons.** While Snaps can run background daemons, Docker offers vastly superior ecosystem support, networking isolation, and deployment orchestration (via Compose/K8s) for server-side applications.

## How it works internally

A `.snap` package is not an archive that is unpacked onto your hard drive. It is a read-only, heavily compressed **SquashFS** filesystem image.

When you run `snap install app`, the `snapd` background daemon downloads this SquashFS file into `/var/lib/snapd/snaps/`.
It does not extract the files. Instead, `snapd` generates a `systemd` mount unit. It uses the Linux kernel's `loop` device feature to dynamically mount the compressed file as a read-only disk directly into the filesystem hierarchy at `/snap/<app-name>/<revision>/`.

To execute the application, `snapd` creates a sophisticated security sandbox. It dynamically generates an **AppArmor** profile that explicitly blocks the application from reading `/home`, `/etc`, or accessing the network unless explicitly permitted. It also configures `seccomp-bpf` filters to block the application from making dangerous Linux kernel system calls.

When the user types the application name in the terminal, they are actually executing a wrapper binary pointing to `/snap/bin/<app>`. This wrapper invokes the application inside the confined AppArmor profile and isolates its writable state to specifically designated, persistent directories (like `~/snap/<app-name>/current/`).

## Performance Notes

- **Loop Device Limits:** Because every snap (and its revisions) requires a dedicated loop device mount, heavily utilizing snaps significantly clutters the output of `df -h` and `lsblk` with dozens of loopback mounts. In extreme scenarios, the kernel can run out of available `/dev/loop*` devices.
- **Desktop Font/Theme Glitches:** Because snaps are perfectly isolated, they cannot inherently read the host user's custom GTK themes, icon packs, or specialized fonts located in `~/.themes`. Graphical applications often launch looking completely alien compared to the native OS environment until complex interface connections are manually established.

## Security Notes

- **Centralized Trust (The Snap Store):** Unlike `apt` or `flatpak`, which support adding third-party, decentralized repositories, the Snap ecosystem is completely hardcoded to trust exactly one centralized registry: Canonical's Snap Store. You cannot self-host a snap repository, creating a vendor lock-in scenario for enterprise deployments.
- **The `--classic` Confinement Risk:** Applying `--classic` completely disables the AppArmor and seccomp sandbox. The application gains the exact same permissions as the user executing it. You should strictly audit software before installing it with the classic flag, as it entirely defeats the security premise of containerized packages.

## Common Mistakes

- **Losing data via `remove`**
  - _Mistake:_ You uninstall a database snap (`snap remove nextcloud`), then immediately reinstall it, but all your data is missing.
  - _Why:_ Unlike `apt remove`, which leaves `/var/lib` data intact, `snap remove` physically deletes the application's data directory. It _does_ take a snapshot (zipped backup) of the data before deletion, saving it in `/var/lib/snapd/snapshots/` for 31 days. You must manually execute `snap restore <snapshot-id>` to recover your database.
- **Assuming binaries update immediately**
  - _Mistake:_ Expecting an app to be updated instantly when the developer publishes a new version.
  - _Why:_ The `snapd` daemon polls the Canonical servers on a randomized timer roughly four times a day. Your server might not see the update for up to 6 hours unless you explicitly force the sync by typing `snap refresh`.

## Best Practices

- **Manage Snapshot Retention:** If you are uninstalling massive applications (like an IDE or database) just to free up space, remember that `snap` keeps a backup of the user data for 31 days, continuing to consume disk space. Use `snap remove --purge <app>` to forcefully delete the application and explicitly instruct `snapd` to skip the snapshot backup.
- **Alias Classic Snaps:** Some classic snaps don't map cleanly to global paths. If a tool doesn't launch, verify its path in `/snap/bin/` and ensure that path is sourced in your `~/.bashrc`.

## Interview Questions

**Q: You deploy a web server using a `.deb` (APT) package and another using a `.snap` package. When you run `df -h`, you notice the `.deb` installation didn't create any new mount points, but the `.snap` installation created a new loopback mount. Explain the architectural difference causing this.**
**A:** `apt` downloads a `.deb` archive and physically extracts the raw binaries and libraries directly into the host's root filesystem (e.g., `/usr/bin/`, `/lib/`). `snap` downloads a `.snap` file, which is a compressed, read-only SquashFS image. It does not extract the files. Instead, the `snapd` daemon instructs the kernel to mount this image as a virtual loopback device directly onto the filesystem (at `/snap/app_name/`). The files are read dynamically from the compressed image during execution.

**Q: A developer installs a text editor using `snap install my-editor`. They try to open a system configuration file located in `/etc/ssh/`, but the editor throws a "Permission Denied" error, even though the developer launched the editor using `sudo`. Why did this happen?**
**A:** By default, snaps are installed with "Strict" confinement. They are sandboxed using kernel AppArmor profiles and namespaces. The sandbox explicitly blocks the application from reading the host's root filesystem, restricting its view to specific approved directories. Even though the application was launched as root, the AppArmor profile overrides the user privileges and blocks the read attempt. The developer would need to install the editor with the `--classic` flag to break out of the sandbox.

## Practice Problems

**Problem:** A recent automated background update broke your containerized `rocketchat-server`. You need to instantly restore the chat server to the exact version and database state it held yesterday to get the company back online. Write the command to perform this rollback.
**Hint:** Use the specific command designed to undo a refresh.
**Solution:**

```bash
sudo snap revert rocketchat-server
```

**Problem:** You are installing a powerful systems-level tool, `certbot`, which needs access to write SSL certificates to your host's `/etc/letsencrypt` directory. Because standard snaps are sandboxed, you must install this package while explicitly bypassing the strict AppArmor security confinement.
**Hint:** Append the flag that disables sandboxing during installation.
**Solution:**

```bash
sudo snap install certbot --classic
```

## References

- [Snapcraft Documentation](https://snapcraft.io/docs/)
- [Managing updates (Snapd)](https://snapcraft.io/docs/keeping-snaps-up-to-date)
