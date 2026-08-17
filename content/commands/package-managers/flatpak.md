---
slug: flatpak
name: flatpak
aliases: []
category: package-managers
tags: [linux, packages, desktop, sandboxing, containers, deployment]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install sandboxed application'
  - 'manage flatpak runtimes'
  - 'update flatpak apps'
  - 'override flatpak permissions'
  - 'list installed flatpaks'
relatedCommands: [snap, apt, dnf, pacman]
alternatives: [snap, apt]
status: draft
---

## What is it?

`flatpak` is a utility for software deployment and package management that offers a sandboxed environment where users can run application software in isolation from the rest of the host system. It completely decouples applications from the underlying host operating system dependencies by bundling shared libraries into "runtimes," allowing developers to build a single application package that functions identically across entirely different Linux distributions.

## Why does it exist?

Historically, Linux software distribution was fractured; developers had to package their applications separately as `.deb` for Debian/Ubuntu, `.rpm` for Red Hat/Fedora, and `PKGBUILD` for Arch Linux, while constantly fighting mismatched library versions (dependency hell). `flatpak` exists to solve this fragmentation by providing a universal, distribution-agnostic package format. Furthermore, it addresses traditional Linux desktop security flaws by introducing strict containerized sandboxing using namespaces and cgroups, forcing applications to request explicit permission (via D-Bus portals) to access hardware, networks, or user files.

## Syntax

```bash
flatpak [OPTION...] COMMAND [OPTION...]
```

## Flags

| Command / Flag      | Description                                                                                                               | Example                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `install`           | Installs an application or runtime from a configured remote repository (like Flathub).                                    | `flatpak install flathub org.gimp.GIMP`                 |
| `uninstall`         | Removes an installed application or runtime from the system.                                                              | `flatpak uninstall org.gimp.GIMP`                       |
| `update`            | Updates all installed applications and runtimes to their latest available versions.                                       | `flatpak update`                                        |
| `list`              | Lists all currently installed applications and runtimes on the system.                                                    | `flatpak list --app`                                    |
| `search`            | Searches all configured remote repositories for a specific application or runtime by name or description.                 | `flatpak search spotify`                                |
| `run`               | Executes a sandboxed application. Necessary because Flatpaks are not automatically added to the system `$PATH`.           | `flatpak run com.spotify.Client`                        |
| `info`              | Displays detailed metadata about an installed application, including its required runtime, branch, and exact commit hash. | `flatpak info org.videolan.Gimp`                        |
| `override`          | Modifies the sandbox permissions of an installed application (e.g., granting filesystem access or exposing device nodes). | `flatpak override --user --filesystem=host org.app.App` |
| `remote-add`        | Adds a new remote repository (registry) to the system configuration.                                                      | `flatpak remote-add --if-not-exists flathub <url>`      |
| `repair`            | Verifies and attempts to repair the local OSTree repository storage if filesystem corruption occurs.                      | `flatpak repair`                                        |
| `-y`, `--assumeyes` | Automatically answers "yes" to all interactive prompts. Essential for non-interactive automated deployment scripts.       | `flatpak install -y flathub org.app.App`                |

## Examples

```bash
flatpak remote-add --if-not-exists flathub [https://flathub.org/repo/flathub.flatpakrepo](https://flathub.org/repo/flathub.flatpakrepo)
```

> The fundamental bootstrap command. By default, a fresh Linux installation has no Flatpak remotes. This command securely adds the official Flathub registry to the system, acting as the primary application source for all subsequent installations.

```bash
flatpak install flathub com.visualstudio.code
```

> Installs a specific application. `flatpak` contacts the Flathub remote, resolves the application manifest, automatically identifies which base SDK/runtime (like the Freedesktop or GNOME runtime) is required, and downloads both the runtime and the application simultaneously via delta-updates.

```bash
flatpak run org.mozilla.firefox
```

> Executes a Flatpak application. Because Flatpaks are containerized and their binaries reside in isolated OSTree paths rather than `/usr/bin`, they must be explicitly invoked through the `flatpak run` wrapper, which dynamically constructs the bubblewrap sandbox before launching the process.

```bash
sudo flatpak override org.gimp.GIMP --filesystem=/mnt/nas_storage
```

> Manipulates sandbox boundaries. If GIMP was packaged without permission to read external hard drives, it cannot open files outside the user's `$HOME` directory. This administrative command injects a permanent override rule, mounting the external `/mnt/nas_storage` path directly into the application's isolated namespace.

```bash
flatpak uninstall --unused
```

> An essential cleanup operation. Over time, as applications are updated, older runtimes and SDKs are abandoned. This command identifies runtimes that no longer have any active applications depending on them and purges them, frequently reclaiming gigabytes of disk space.

## Real-World Scenarios

**Automated Desktop Provisioning**

```bash
flatpak install -y flathub com.slack.Slack com.discordapp.Discord org.videolan.VLC
```

> In corporate workstation provisioning, IT administrators use scripts to bootstrap a fresh laptop. By passing the `-y` flag, `flatpak` silently pulls and installs the required communication and media tools from Flathub without requiring the user to press 'Y' during the lengthy GPG key and runtime installation prompts.

**Downgrading a Broken Application**

```bash
flatpak remote-info --log flathub com.obsproject.Studio
sudo flatpak update --commit=abc123def456 com.obsproject.Studio
```

> A recent application update introduces a fatal bug. Because Flatpak uses OSTree (which behaves like Git for binaries), the administrator lists the commit history of the application, copies the commit hash of the previous stable version, and forcibly updates (downgrades) the local installation to that specific, immutable tree state to restore functionality.

## When should it NOT be used?

- **System Daemons and Services:** **Do not use `flatpak` for background system services.** Flatpak is explicitly designed for desktop GUI applications. It relies heavily on D-Bus user sessions and graphical portals. For containerizing backend daemons (like NGINX or PostgreSQL), use Docker or Podman.
- **Command-Line Utilities:** **Do not use `flatpak` for core CLI tools.** Because Flatpaks are deeply sandboxed, a CLI tool packaged as a Flatpak cannot easily pipe data, read arbitrary system files, or execute host binaries without complex overrides. Use native package managers (`apt`, `pacman`) for terminal utilities.
- **Kernel Modules and Drivers:** Flatpaks operate entirely in user-space using kernel namespaces. They cannot install or load kernel modules, custom network interfaces, or raw hardware drivers.

## Alternatives

- **`snap`:** **Best for headless/server tools.** Developed by Canonical (Ubuntu), Snaps also containerize apps but support system-level background daemons, CLI tools, and strict kernel-enforced AppArmor profiles, making them viable for both server and desktop.
- **`AppImage`:** **Best for portability without daemons.** A single, monolithic executable file containing an application and all its dependencies. It requires zero installation, no system daemons, and runs directly via FUSE mounts.
- **Native Package Managers (`apt`, `dnf`):** **Best for system integration.** Native packages integrate flawlessly with system themes, global libraries, and `$PATH`, but lack sandboxing and cross-distribution portability.

## How it works internally

`flatpak` is built on top of two major underlying technologies: **OSTree** and **Bubblewrap**.

1. **Storage (OSTree):** Flatpak uses OSTree to manage files. OSTree operates like `git` for operating system binaries. When `flatpak install` downloads an application, it isn't downloading a flat `.tar.gz`. It downloads an OSTree commit consisting of content-addressed file objects. These objects are stored centrally (usually in `/var/lib/flatpak/repo`). When an application is updated, OSTree only downloads the binary deltas (the exact bytes that changed), drastically reducing bandwidth. Furthermore, multiple applications that share the same runtime deduplicate their data perfectly on disk via hardlinks.

2. **Execution (Bubblewrap):** When you run `flatpak run`, it invokes `bwrap` (Bubblewrap). Bubblewrap utilizes Linux kernel features—specifically User, Mount, PID, and Network Namespaces, along with cgroups and seccomp filters. It creates a temporary, unprivileged container. It mounts the application's read-only OSTree snapshot into this container, mounts the required runtime, and strictly isolates the application's view of the filesystem (usually only exposing `~/.var/app/<app-id>` for writable state).

To communicate with the host (e.g., opening a file dialog or using the webcam), Flatpak intercepts the calls and routes them through **XDG Desktop Portals**. The portal securely asks the user for permission, and if granted, passes a secure file descriptor back through the D-Bus proxy into the sandbox.

## Performance Notes

- **Storage Overhead:** The first application you install via Flatpak will consume a massive amount of disk space (often 1GB+) because it must download the entire base runtime (e.g., KDE or GNOME Platform). However, subsequent applications utilizing that same runtime require almost zero additional space, making the storage penalty heavily front-loaded.
- **Startup Latency:** Launching a Flatpak requires setting up the Bubblewrap namespaces, mounting the OSTree trees via FUSE, and establishing D-Bus proxies. This introduces a slight but measurable initialization delay (milliseconds) compared to launching a native un-sandboxed binary directly from `/usr/bin`.

## Security Notes

- **Permission Leaks:** Sandboxing is only effective if enforced. Many early Flatpak applications requested the `--filesystem=host` permission because developers did not want to implement XDG Portals. If an application possesses this permission, the sandbox is effectively bypassed, allowing the app to read/write anywhere in the user's home directory.
- **X11 vs Wayland:** If a Flatpak application runs on the legacy X11 display server rather than Wayland, it inherently possesses the ability to keylog or screenshot all other applications running on the desktop due to X11's lack of display isolation, partially mitigating the security benefits of the Bubblewrap sandbox.

## Common Mistakes

- **Assuming binaries are in the PATH**
  - _Mistake:_ Installing `flatpak install flathub org.gimp.GIMP` and typing `gimp` into the terminal, resulting in `command not found`.
  - _Why:_ Flatpak does not pollute the host `/usr/bin` directory. It places execution wrappers in `/var/lib/flatpak/exports/bin/`. You must either add that directory to your shell `$PATH`, or explicitly use the `flatpak run org.gimp.GIMP` command to launch it.
- **Modifying files inside the sandbox manually**
  - _Mistake:_ Attempting to alter a configuration file deep inside `/var/lib/flatpak/app/`.
  - _Why:_ The application installation directories are OSTree checkouts. They are immutable and mounted as read-only. Any application-specific configurations or saved states a user makes are actually redirected and permanently stored in `~/.var/app/<app-id>/`.

## Best Practices

- **Audit Permissions with Flatseal:** Managing granular override flags via the CLI (`flatpak override`) is tedious. Power users should install the `Flatseal` application (also available via Flathub), which provides a dedicated GUI to review and toggle every filesystem, network, and hardware permission for every installed Flatpak.
- **Regular Pruning:** Schedule a monthly execution of `flatpak uninstall --unused` to prevent orphaned SDKs and runtimes from silently consuming tens of gigabytes of root partition storage.

## Interview Questions

**Q: Explain how Flatpak manages application dependencies (like Qt, GTK, or specific Python versions) without conflicting with the host operating system's libraries.**
**A:** Flatpak utilizes the concept of "Runtimes." A runtime is a massive, read-only bundle of core libraries (e.g., the Freedesktop or GNOME runtime). Applications declare which runtime they depend on. When the application launches, Bubblewrap mounts the specific requested runtime into the container's isolated namespace, overriding `/usr`. This ensures the application sees the exact library versions it was compiled against, while the host OS's native libraries remain completely untouched and isolated outside the sandbox.

**Q: A user installs a text editor via Flatpak. When they attempt to open a configuration file located in `/etc/`, the editor claims the file does not exist. Why does this happen, and how is it resolved?**
**A:** This happens because of Flatpak's filesystem sandboxing. By default, the application is isolated inside a Mount Namespace and physically cannot see the host's `/etc/` directory. To resolve this, the administrator must punch a hole in the sandbox using an override: `flatpak override <app-id> --filesystem=/etc`.

## Practice Problems

**Problem:** You are running out of disk space. Write the command to instruct Flatpak to automatically identify and safely remove any runtimes or SDKs that are no longer actively used by any installed application.
**Hint:** Use the uninstall command with the flag that targets orphaned dependencies.
**Solution:**

```bash
flatpak uninstall --unused
```

**Problem:** You want to install the application `com.spotify.Client` from the `flathub` remote, but you are putting this in an automated script and cannot have it prompt you to confirm the installation or accept GPG keys. Write the command.
**Hint:** Use the flag that automatically assumes "yes" to all interactive questions.
**Solution:**

```bash
flatpak install -y flathub com.spotify.Client
```

## References

- [Flatpak Command Reference](https://docs.flatpak.org/en/latest/flatpak-command-reference.html)
- [Under the Hood (Flatpak Internals)](https://docs.flatpak.org/en/latest/under-the-hood.html)
