---
slug: apt
name: apt
aliases: [apt-get, apt-cache]
category: package-managers
tags: [package-manager, debian, ubuntu, install, update, software]
difficulty: beginner
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install package on ubuntu'
  - 'update debian system'
  - 'remove software apt'
  - 'search for package apt'
  - 'upgrade installed linux packages'
relatedCommands: [dpkg, snap, apk, brew, dnf, flatpak]
alternatives: [dpkg, snap, apk, brew, flatpak, pacman]
status: draft
---

## What is it?

`apt` (Advanced Package Tool) is the high-level, interactive package manager for Debian and Ubuntu-based Linux distributions. It provides a streamlined, user-friendly command-line interface to search, download, install, update, and remove compiled binary software packages while automatically resolving complex dependency trees.

## Why does it exist?

Historically, managing software on Debian required using `dpkg` to install local `.deb` files, which could not fetch software from remote networks or resolve missing dependencies automatically, leading to "dependency hell." The tools `apt-get` and `apt-cache` were created to solve this via remote repositories and SAT solvers, but their disparate interfaces were clunky for end-users. `apt` exists to unify the most commonly used commands from `apt-get` and `apt-cache` into a single, polished binary with safer defaults, built-in progress bars, and colorized output optimized for human interaction.

## Syntax

```bash
apt [options] command [package ...]
```

## Flags

| Flag                      | Description                                                                                                    | Example                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `-y`, `--yes`             | Automatically assumes "yes" to all interactive prompts, executing without human intervention.                  | `apt install -y nginx`                             |
| `-q`, `--quiet`           | Omits progress indicators and reduces output verbosity. Append twice (`-qq`) for silent logging.               | `apt update -qq`                                   |
| `--no-install-recommends` | Prevents the installation of "recommended" packages, significantly reducing bloat and image sizes.             | `apt install --no-install-recommends htop`         |
| `--only-upgrade`          | Prevents the installation of new packages; it will only upgrade packages that are already installed.           | `apt install --only-upgrade curl`                  |
| `-f`, `--fix-broken`      | Attempts to correct a system with broken dependencies left behind by a failed installation.                    | `apt install -f`                                   |
| `--download-only`         | Fetches the `.deb` package files into the local cache but does not unpack or install them.                     | `apt install --download-only postgresql`           |
| `--purge`                 | Used with the `remove` command to delete both the package binaries AND its configuration files.                | `apt remove --purge apache2`                       |
| `--autoremove`            | Automatically removes orphaned dependencies that were installed with other packages but are no longer needed.  | `apt remove --autoremove vim`                      |
| `-s`, `--simulate`        | Performs a dry-run, showing exactly what would be modified without requiring root privileges or altering disk. | `apt upgrade -s`                                   |
| `-o <Config=Val>`         | Injects temporary APT configuration options directly from the command line.                                    | `apt -o Dpkg::Options::="--force-confdef" upgrade` |

## Examples

```bash
apt update
```

> This synchronizes the local package index files with the remote repositories defined in `/etc/apt/sources.list`. It does not install or upgrade any software; it simply downloads the latest metadata map of available software versions.

```bash
apt upgrade -y
```

> This compares the locally installed software versions against the synchronized metadata cache and upgrades all outdated packages to their newest available versions, automatically accepting any prompts (`-y`).

```bash
apt install --no-install-recommends git curl
```

> This installs both `git` and `curl`. By specifying `--no-install-recommends`, it skips downloading supplementary packages that the maintainer suggested but aren't strictly required, keeping the system minimal.

```bash
apt search "nginx proxy"
```

> This queries the local APT cache for packages whose names or descriptions match the provided regex or string parameters, helping administrators discover software without knowing the exact package name.

```bash
apt purge apache2 && apt autoremove
```

> This aggressively removes the `apache2` package and all its modified configuration files from `/etc` via `purge`. It then executes `autoremove` to sweep the system and delete any residual libraries (like `apache2-utils`) that were originally installed as dependencies but are now orphaned.

## Real-World Scenarios

**Building Minimal Docker Images**

```bash
apt-get update && apt-get install -y --no-install-recommends python3-pip && rm -rf /var/lib/apt/lists/*
```

> DevOps engineers use this chained command in `Dockerfiles`. It fetches metadata, installs the package silently without bloat, and immediately deletes the repository metadata cache (`/var/lib/apt/lists/*`) to reduce the final container image size by dozens of megabytes.

**Unattended Security Patching**

```bash
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
```

> Systems administrators execute automated cron jobs to apply security patches. The `-o` configuration injections force `dpkg` to keep existing, modified configuration files automatically without hanging the terminal waiting for human input during an upgrade.

**Recovering from Broken Dependencies**

```bash
dpkg -i proprietary-app.deb || apt install -f -y
```

> When manually installing a downloaded `.deb` file fails because the system lacks necessary libraries, engineers immediately follow up with `apt install -f`. APT detects the broken state and reaches out to the internet to download and satisfy the missing dependencies required by the failed package.

## When should it NOT be used?

- **Inside automated, non-interactive CI/CD scripts:** **Reason:** The `apt` command is designed for human interaction. Its output formatting, progress bars, and warnings change frequently between OS versions, which breaks shell parsing logic. **Use instead:** `apt-get` and `apt-cache`, which offer stable, backward-compatible scripting interfaces.
- **Installing completely isolated, containerized desktop applications:** **Reason:** `apt` installs binaries globally, potentially causing conflicting library versions across the host OS. **Use instead:** `snap` or `flatpak`.

## Alternatives

- **`apt-get` / `apt-cache`:** The stable, low-level frontends. **Tradeoff:** They lack the unified interface and pretty colors of `apt`, but are mathematically stable and guaranteed not to break backward compatibility in automation scripts.
- **`dpkg`:** The absolute base-level backend. **Tradeoff:** Capable of installing local offline files seamlessly, but physically incapable of reaching across the network or resolving missing dependency graphs.
- **`aptitude`:** An advanced Ncurses-based terminal UI. **Tradeoff:** Offers a powerful graphical terminal interface and vastly superior conflict-resolution algorithms compared to `apt`, but is rarely installed by default on minimal cloud servers.

## How it works internally

When you execute `apt update`, the utility reads the repository URLs listed in `/etc/apt/sources.list` and `/etc/apt/sources.list.d/`. It downloads cryptographically signed metadata indexes (e.g., `Packages.gz` and `Release.gpg`) via HTTP/HTTPS and unpacks them into `/var/lib/apt/lists/`.

When executing `apt install <package>`, APT queries this local metadata cache. It utilizes a Boolean Satisfiability (SAT) solver to map out the dependency graph, determining exactly which external libraries must be downloaded to satisfy the target package without breaking existing software.

APT then downloads the required `.deb` archives from the remote repositories and stores them in `/var/cache/apt/archives/`. Once downloaded and verified via GPG signatures, `apt` hands execution over to the low-level `dpkg` binary. `dpkg` unpacks the `.deb` archives, copies the binaries to the filesystem, executes pre- and post-installation maintainer scripts, and registers the installation inside the `/var/lib/dpkg/status` database.

## Performance Notes

- Running `apt update` over slow networks can block deployments for minutes. Replacing default HTTP archive mirrors with geographically localized mirrors (or utilizing an internal caching proxy like `apt-cacher-ng`) dramatically accelerates updates.
- Because APT must maintain absolute state consistency, it acquires a strict file lock (`/var/lib/dpkg/lock`). You cannot run two `apt` operations concurrently; the second process will hang indefinitely waiting for the lock to be released.

## Security Notes

- **GPG Signature Verification:** By default, APT refuses to install packages from untrusted repositories. It downloads `InRelease` files and verifies their cryptographic signatures against the public GPG keys stored in `/etc/apt/trusted.gpg.d/`. If a signature is invalid or expired, the operation is blocked to prevent supply chain tampering.
- **Root Execution Vulnerabilities:** Packages installed via APT execute pre/post installation shell scripts (`postinst`) automatically as the `root` user. Installing compromised packages grants the attacker instantaneous, full root execution over the host OS.

## Common Mistakes

- **Forgetting `apt update` before `apt install`:** **Why it's wrong:** The local metadata cache is stale. You will ask APT to download version `1.0` of a package, but the remote server only has `1.1` available, resulting in fatal HTTP 404 Not Found errors.
- **Using `apt upgrade` instead of `apt full-upgrade` during major OS transitions:** **Why it's wrong:** Standard `upgrade` will strictly refuse to remove existing packages. If a new kernel or major software update requires removing an obsolete dependency to proceed, `upgrade` will hold the package back. You must use `full-upgrade` to allow dependency removal.
- **Deleting the `dpkg/lock` file forcefully:** Killing a hanging `apt` process and running `rm /var/lib/dpkg/lock` to bypass the lock error. **Why it's wrong:** Force-deleting the lock while the database is partially written guarantees severe `dpkg` database corruption, often requiring manual hex-editing of the status file to recover the OS.

## Best Practices

- In all non-interactive scripts (Dockerfiles, Ansible, Bash), unconditionally use `apt-get` rather than `apt`, combined with the `DEBIAN_FRONTEND=noninteractive` environment variable, to ensure absolute automation stability and suppress terminal UI warnings.
- Routinely execute `apt clean` and `apt autoremove` on long-lived servers to clear out gigabytes of stale downloaded `.deb` archives from the cache and purge orphaned dependency libraries.
- Pin critical software versions by creating files in `/etc/apt/preferences.d/` to prevent `apt upgrade` from accidentally deploying a breaking major-version update to mission-critical databases or runtimes.

## Interview Questions

- **Q:** What is the fundamental difference in purpose and execution between running `apt update` and `apt upgrade`?
  - **A:** `apt update` does not modify or install any local software binaries. It strictly reaches out to remote repositories to download the latest package metadata and dependency indexes, updating the local cache. `apt upgrade` reads that updated local cache, compares it against currently installed software, and downloads and overwrites the actual local binaries with their newer versions.
- **Q:** Why does Docker documentation fiercely recommend writing `apt-get install -y --no-install-recommends` instead of just `apt install -y` when compiling container images?
  - **A:** Debian package maintainers define both "Depends" (hard requirements) and "Recommends" (soft suggestions like extra fonts, documentation, or optional plugins). By default, APT installs both. Passing `--no-install-recommends` strips out the soft suggestions, significantly reducing the disk bloat and network transfer time of the final Docker image without breaking the core application.
- **Q:** You run `apt install nginx` and receive the error: "Could not get lock /var/lib/dpkg/lock-frontend". What is the architectural reason for this error, and how is it resolved?
  - **A:** APT and dpkg operations are non-concurrent. To prevent corrupting the local software database by writing two different states simultaneously, the first APT process acquires a mandatory file lock. This error means another process (often a background unattended-upgrades cron job, or a frozen terminal session) is currently holding the lock. You must wait for that process to finish or safely terminate it.

## Practice Problems

- _Problem:_ Install the `jq` package automatically without prompting the user, ensuring that no supplementary, non-essential "recommended" packages are installed alongside it.
  - _Hint:_ Combine the auto-confirm flag with the exclusion flag for soft dependencies.
  - _Solution:_ `apt install -y --no-install-recommends jq` (This guarantees a minimal, non-interactive installation).
- _Problem:_ Search the local APT cache for any package containing the exact string `memcached` in its name or description, suppressing heavy formatting if possible.
  - _Hint:_ Use the basic query command provided by the tool.
  - _Solution:_ `apt search memcached` (This queries the local metadata map and returns matching repository objects).

## References

- [Debian Administrator's Handbook - APT](https://debian-handbook.info/browse/stable/apt.html)
- [Man Page for apt (Linux)](https://manpages.ubuntu.com/manpages/focal/man8/apt.8.html)
