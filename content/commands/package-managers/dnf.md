---
slug: dnf
name: dnf
aliases: [yum]
category: package-managers
tags: [package-manager, rhel, fedora, rpm, centos, software]
difficulty: beginner
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install rpm package linux'
  - 'update fedora redhat system'
  - 'search dnf repository'
  - 'remove software dnf'
  - 'undo previous dnf update'
relatedCommands: [rpm, apt, apk, brew, flatpak]
alternatives: [rpm, apk, brew, pacman]
status: draft
---

## What is it?

`dnf` (Dandified YUM) is the modern, high-level software package manager for RPM-based Linux distributions such as RHEL, Fedora, CentOS, and Rocky Linux. It automates the installation, update, and removal of `.rpm` packages, fetching them from remote repositories while utilizing advanced mathematical algorithms to resolve complex software dependency graphs cleanly.

## Why does it exist?

For over a decade, RPM-based systems relied on `yum` (Yellowdog Updater, Modified). However, `yum` was notoriously slow, consumed excessive memory, possessed an undocumented internal API, and utilized a flawed dependency resolution algorithm that occasionally broke system states. `dnf` was engineered as a total rewrite to solve these architectural flaws. By implementing `libsolv` (a strict boolean satisfiability solver developed by openSUSE) and a streamlined Python 3 API, `dnf` exists to provide lightning-fast, mathematically perfect dependency resolution and reliable transaction rollbacks.

## Syntax

```bash
dnf [options] <command> [<args>...]
```

## Flags

| Flag                   | Description                                                                                                     | Example                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `-y`, `--assumeyes`    | Automatically answers "yes" to all interactive prompts, ideal for unattended script execution.                  | `dnf install -y nginx`                     |
| `-q`, `--quiet`        | Executes silently, suppressing progress bars and standard informational output.                                 | `dnf update -q`                            |
| `--enablerepo=<repo>`  | Temporarily enables a specific, normally disabled repository for the duration of the command.                   | `dnf install htop --enablerepo=epel`       |
| `--disablerepo=<repo>` | Temporarily ignores packages from a specific repository to prevent version conflicts.                           | `dnf update --disablerepo=updates-testing` |
| `--refresh`            | Forces DNF to discard its metadata cache and aggressively re-download repository data before executing.         | `dnf upgrade --refresh`                    |
| `--allowerasing`       | Grants DNF permission to remove currently installed packages to resolve conflicts during an upgrade.            | `dnf upgrade --allowerasing`               |
| `--nobest`             | Instructs DNF to install the best _available_ version if the absolute latest version has broken dependencies.   | `dnf install docker --nobest`              |
| `--downloadonly`       | Downloads the target `.rpm` files into the local cache without initiating the installation phase.               | `dnf install postgresql --downloadonly`    |
| `--showduplicates`     | Forces search/list commands to display all available versions of a package across all repositories.             | `dnf search kernel --showduplicates`       |
| `--security`           | Filters an upgrade command to strictly apply packages classified as security patches, ignoring feature updates. | `dnf upgrade --security`                   |

## Examples

```bash
dnf upgrade --refresh
```

> This forces a strict refresh of the remote repository metadata cache, compares it against the local system state, and upgrades all installed RPM packages to their latest versions cleanly.

```bash
dnf install -y gcc make
```

> This requests the installation of the `gcc` and `make` packages. DNF invokes its `libsolv` backend, calculates any missing core libraries, downloads the RPMs, and installs everything automatically without prompting.

```bash
dnf search "web server"
```

> This queries the SQLite metadata cache for the provided string, returning a list of RPM packages whose names or summary descriptions match the terms, allowing administrators to find software conceptually.

```bash
dnf history
```

> This prints a tabular audit log of all past `dnf` transactions (installs, removals, upgrades) executed on the system, including a transaction ID, the executing user, the date, and the action performed.

```bash
dnf history undo 14
```

> This leverages the powerful transaction tracking system. It targets the exact state changes made during Transaction ID `14` and mathematically calculates the exact downgrades and removals necessary to perfectly revert the system to its state prior to that transaction.

## Real-World Scenarios

**Enterprise Security Patching**

```bash
dnf upgrade-minimal --security -y
```

> Systems administrators maintaining high-uptime compliance environments use the `--security` flag. This guarantees that DNF ignores general software updates (which might introduce bugs) and strictly applies only packages marked by Red Hat as addressing Common Vulnerabilities and Exposures (CVEs).

**Bootstrapping the EPEL Repository**

```bash
dnf install -y epel-release && dnf install -y htop --enablerepo=epel
```

> Cloud engineers provisioning RHEL/CentOS instances first install the Extra Packages for Enterprise Linux (EPEL) configuration package. They then explicitly pull software from it, expanding the default enterprise software library with thousands of open-source utilities.

**Cleaning Up Orphaned Infrastructure**

```bash
dnf autoremove -y
```

> After tearing down massive application stacks, DevOps pipelines execute `autoremove`. DNF sweeps its database to identify "leaf" packages—libraries that were pulled in automatically as dependencies for software that has since been deleted—and purges them to reclaim storage space.

## When should it NOT be used?

- **Installing completely isolated, unindexed local `.rpm` files lacking network dependency access:** **Reason:** While `dnf localinstall` exists, if the local `.rpm` requires dependencies not available in your configured repos, DNF will fail. The low-level `rpm -i` command handles raw binaries but provides no dependency safety nets.
- **Cross-distribution deployment pipelines:** **Reason:** `dnf` is strictly bound to Red Hat derivative OSs (RHEL, Fedora, Rocky). **Use instead:** Abstraction layers like Ansible (`ansible.builtin.package`) which dynamically map to `dnf` on RHEL and `apt` on Ubuntu.

## Alternatives

- **`yum`:** The legacy predecessor. **Tradeoff:** On modern systems (RHEL 8+), typing `yum` is literally just a symlink redirecting execution to the `dnf` binary under the hood. True `yum` is functionally obsolete.
- **`rpm`:** The foundational base-level package tool. **Tradeoff:** `rpm` installs local binary files perfectly but is structurally incapable of reaching across networks to download missing dependencies, meaning it suffers from severe "dependency hell."
- **`zypper`:** The openSUSE package manager. **Tradeoff:** Built on the exact same `libsolv` backend architecture as `dnf`, providing similar speeds but catering to the SUSE ecosystem syntax.

## How it works internally

When you execute `dnf install`, the utility parses repository configuration files located in `/etc/yum.repos.d/`. It downloads XML or metadata formats (often heavily compressed via `zchunk` or `xz`) containing the manifests of all available RPMs from remote HTTP/HTTPS mirrors.

DNF stores this metadata in a highly optimized local SQLite database (`/var/cache/dnf/`). It then hands the user's request to **`libsolv`**, an advanced C-based dependency resolver. `libsolv` translates the local system state and remote package requirements into a massive Boolean Satisfiability (SAT) problem. It calculates the mathematically perfect upgrade path in microseconds.

Once resolved, DNF downloads the required `.rpm` files into the cache. To save bandwidth, it heavily utilizes **Delta RPMs (`drpm`)**, downloading only the binary differential data between the old installed package and the new one, reassembling the full RPM locally. Finally, it invokes the low-level `rpm` backend library to execute the physical unpacking, script execution (`%post`), and database registration, recording the entire event in its local `dnf history` SQLite ledger.

## Performance Notes

- DNF is dramatically faster than legacy `yum` explicitly because it offloads the dependency graph calculation to the C-compiled `libsolv` library rather than relying on inefficient pure Python evaluation loops.
- Downloading massive repository metadata updates on slow networks is DNF's primary bottleneck. Utilizing `zchunk` metadata (which downloads only the modified portions of the repository catalog) significantly minimizes this latency.

## Security Notes

- **GPG Signature Enforcement:** DNF natively enforces strict cryptographic integrity. If `gpgcheck=1` is configured (the default), DNF physically refuses to install any downloaded `.rpm` payload if its cryptographic signature does not match the repository's registered public GPG key, neutralizing Man-in-The-Middle (MitM) supply chain attacks.
- **Root Execution Hooks:** RPM packages contain `%pre` and `%post` execution macros. Installing a malicious package via DNF executes these bash scripts with absolute `root` privileges. Never add untrusted third-party repository URLs to `/etc/yum.repos.d/`.

## Common Mistakes

- **Bypassing DNF with raw `rpm -e` removals:** Using `rpm -e` to forcefully uninstall a package. **Why it's wrong:** DNF tracks transactions in an SQLite database to allow clean rollbacks (`dnf history undo`). Ripping packages out using the low-level `rpm` tool causes the DNF database state to desync from the physical filesystem.
- **Misunderstanding `upgrade` vs `update`:** Historically in `yum`, these commands handled obsolete packages differently. **Why it's wrong:** In modern `dnf`, `update` is literally an alias for `upgrade`. They execute the exact same codebase. Using `upgrade` is the preferred semantic standard.
- **Using `--skip-broken` as a crutch:** **Why it's wrong:** Forcing DNF to skip packages with broken dependencies during an upgrade leaves systems in fractured, unpredictable states. It is vastly superior to identify the conflicting repository using `--allowerasing` or `--nobest` and resolve it cleanly.

## Best Practices

- When executing critical kernel or database upgrades on production systems, always precede the action by reviewing the state via `dnf history`. If the upgrade fails catastrophically, executing `dnf history undo <ID>` provides an immediate, clean reversal path.
- Utilize `dnf install --downloadonly` on jump hosts to pull required RPMs and their full dependency trees, then securely transfer the cached files to air-gapped internal servers for offline `dnf localinstall`.
- Regularly execute `dnf clean all` to aggressively purge gigabytes of cached XML metadata and lingering `.rpm` archives, especially inside CI/CD Dockerfile builds, to keep image footprints microscopic.

## Interview Questions

- _Query:_ What specific algorithmic library powers `dnf`, making its dependency resolution mathematically superior and orders of magnitude faster than its predecessor `yum`?
  - _A:_ `dnf` integrates the **`libsolv`** library, originally developed by the openSUSE project. `libsolv` translates package dependencies into a strict Boolean Satisfiability (SAT) problem, resolving massive dependency graphs using highly optimized C-code rather than the slow, heuristic Python loops used by legacy `yum`.
- _Query:_ How does `dnf` significantly reduce network bandwidth consumption when performing minor upgrades to massive software packages (like the Linux Kernel or glibc)?
  - _A:_ `dnf` natively supports **Delta RPMs (`drpm`)**. Instead of downloading a brand-new 100MB package archive, it downloads a much smaller payload containing only the binary differences between the locally installed version and the new version. It then applies this delta patch to the local file to recreate the full new RPM before installation.
- _Query:_ A junior admin executes `rpm -e nginx` to delete a web server instead of using `dnf remove nginx`. What specific DNF feature does this bypass and corrupt?
  - _A:_ It breaks the DNF transaction history ledger. `dnf history` relies on an internal SQLite database to track what was installed, removed, and upgraded, allowing for complete system rollbacks (e.g., `dnf history undo`). Using the low-level `rpm` binary circumvents this ledger, meaning DNF loses track of the true system state and cannot safely roll back prior transactions involving that software.

## Practice Problems

- _Problem:_ Upgrade all packages on the system safely without human intervention, but strictly filter the upgrade to apply ONLY packages that patch known security vulnerabilities (CVEs).
  - _Hint:_ Combine the auto-confirm flag with the specific upgrade command and the security filtering flag.
  - _Solution:_ `dnf upgrade --security -y` (This ensures the system is patched against threats without risking instability from new feature introductions).
- _Problem:_ Revert the system state perfectly back to before the most recent transaction was applied, effectively undoing the last installation or upgrade.
  - _Hint:_ Use the history tracking feature to target the last operation.
  - _Solution:_ `dnf history undo last` (This queries the SQLite transaction ledger and calculates the inverse dependency operations required to rollback the most recent event).

## References

- [DNF Official Documentation](https://dnf.readthedocs.io/en/latest/index.html)
- [Fedora System Administrator's Guide - DNF](https://docs.fedoraproject.org/en-US/quick-docs/dnf/)
