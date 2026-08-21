---
slug: dpkg
name: dpkg
aliases: []
category: package-managers
tags: [package-manager, debian, low-level, local-install, deb, linux]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install local deb file'
  - 'list installed packages debian'
  - 'remove software dpkg'
  - 'find what package owns a file'
  - 'fix broken dpkg install'
relatedCommands: [apt]
alternatives: [apt, rpm, apk]
status: draft
---

## What is it?

`dpkg` is the foundational, low-level package manager for Debian and Ubuntu-based Linux distributions. It interacts directly with the local filesystem and the `/var/lib/dpkg/` status database to install, remove, build, and extract standalone `.deb` package archives without relying on remote network repositories or complex dependency resolvers.

## Why does it exist?

While high-level tools like `apt` fetch software from the internet and calculate dependency matrices, they are completely incapable of actually unpacking binary files and writing them to the hard drive. They function merely as intelligent downloaders. `dpkg` exists as the absolute bedrock execution engine. It unpacks the raw `.deb` archives (which are `ar` format files), executes the maintainer's pre/post installation shell scripts, maps files to directories, and maintains the authoritative database of what software currently exists on the physical machine.

## Syntax

```bash
dpkg [option...] action
```

## Flags

| Flag                      | Description                                                                                       | Example                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-i`, `--install <file>`  | Installs the software from a local `.deb` archive file directly onto the system.                  | `dpkg -i google-chrome-stable_current_amd64.deb` |
| `-r`, `--remove <pkg>`    | Removes an installed package by its logical name, leaving configuration files intact.             | `dpkg -r vim`                                    |
| `-P`, `--purge <pkg>`     | Aggressively removes a package _and_ completely deletes all of its configuration files.           | `dpkg -P apache2`                                |
| `-l`, `--list [pattern]`  | Lists all packages currently installed on the system, with optional wildcard pattern matching.    | `dpkg -l "*python*"`                             |
| `-s`, `--status <pkg>`    | Reports deeply detailed status and metadata about a specific installed package.                   | `dpkg -s openssh-server`                         |
| `-S`, `--search <file>`   | Searches the database to identify exactly which installed package owns a specific file path.      | `dpkg -S /etc/host.conf`                         |
| `-L`, `--listfiles <pkg>` | Lists every single absolute filesystem path that was deployed by the specified installed package. | `dpkg -L curl`                                   |
| `--configure <pkg>`       | Forces the execution of the configuration phase for an unpacked but unconfigured package.         | `dpkg --configure -a`                            |
| `--force-all`             | Violently forces `dpkg` to execute operations even if conflicts or errors are detected.           | `dpkg -i --force-all broken.deb`                 |
| `--ignore-depends=<pkg>`  | Forces an installation to proceed even if the specified dependency package is missing locally.    | `dpkg -i --ignore-depends=libc6 app.deb`         |

## Examples

```bash
dpkg -i ./custom_build.deb
```

> This invokes the primary installation action. `dpkg` reads the local `.deb` file, extracts the control metadata and data binaries, writes the files to their respective system directories, and updates the local installation database.

```bash
dpkg -l | grep "^ii"
```

> This pipes the global output of the list action (`-l`). The output features a two-letter status code; filtering for `^ii` cleanly isolates software that is flagged as "installed and successfully configured" across the host OS.

```bash
dpkg -S /bin/ls
```

> This executes a reverse-lookup query. By providing a raw file path, `dpkg` scans its internal manifest ledgers and mathematically determines exactly which originating package (e.g., `coreutils`) deployed that specific binary.

```bash
dpkg -L net-tools
```

> This performs a forward-lookup query. Given the logical name of an installed package (`net-tools`), it dumps an exhaustive list of every single configuration file, binary, and man-page directory that package injected into the filesystem.

```bash
dpkg --configure -a
```

> This is a critical recovery command. If an installation crashes midway (due to a power failure or missing dependencies), this instructs `dpkg` to scan its database for any packages left in a "half-configured" state and attempts to cleanly resume and finalize their installation scripts.

## Real-World Scenarios

**Installing Proprietary Vendor Software**

```bash
wget [https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb](https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb)
dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -f -y
```

> Proprietary applications (like Google Chrome, Slack, or specific VPN clients) are often distributed as direct `.deb` downloads rather than hosted in standard APT repositories. System administrators use `dpkg -i` to install the raw binary, immediately followed by `apt install -f` to instruct APT to reach out to the internet and fetch any missing background libraries the `.deb` required.

**Auditing System Files for Malicious Alterations**

```bash
dpkg -S /etc/ssh/sshd_config
```

> Security incident responders analyzing a potentially compromised server discover a suspicious configuration file. They execute `dpkg -S` to query whether the file officially belongs to a recognized, tracked Debian package (like `openssh-server`), or if it was illegally dropped onto the system by an unauthorized actor.

**Completely Eradicating Misconfigured Services**

```bash
dpkg -P nginx
```

> When a web server configuration becomes catastrophically corrupted beyond manual repair, engineers use the Purge (`-P`) flag. Unlike standard removal (`-r`), purging rips out the binaries _and_ recursively destroys all custom configurations inside `/etc/nginx`, guaranteeing a perfectly blank slate for reinstallation.

## When should it NOT be used?

- **Routine system software installations and updates:** **Reason:** `dpkg` is "dumb." It does not know how to connect to the internet, nor can it download missing dependencies. If a `.deb` requires 10 other packages, `dpkg -i` will crash immediately. **Use instead:** High-level wrappers like `apt` or `apt-get`.
- **Searching for software that is not installed locally:** **Reason:** `dpkg` only possesses knowledge of the local `/var/lib/dpkg/` database. It has no index of the vast global Debian repositories. **Use instead:** `apt search`.

## Alternatives

- **`apt` / `apt-get`:** The intelligent frontends. **Tradeoff:** `apt` natively wraps around `dpkg`. It calculates complex dependency graphs and fetches data over HTTPs before handing the files off to `dpkg` for execution.
- **`rpm`:** The Red Hat equivalent. **Tradeoff:** `rpm` handles raw binary packages for RHEL/CentOS ecosystems (`.rpm` files) using exactly the same low-level execution philosophy that `dpkg` uses for Debian ecosystems.

## How it works internally

A `.deb` package file is structurally an `ar` (archiver) archive. It natively contains three nested files: `debian-binary` (version info), `control.tar.gz` (metadata, dependencies, and execution scripts like `preinst`, `postinst`, `prerm`, `postrm`), and `data.tar.gz` (the actual software binaries and configuration files).

When you execute `dpkg -i <file.deb>`, the utility opens the archive. It extracts the `control` metadata to verify architectural compatibility and cross-references the required dependencies against its local state database located at `/var/lib/dpkg/status`. If dependencies are missing, it halts with an error (unless forced).

If dependencies are satisfied, `dpkg` executes the `preinst` (pre-installation) shell script. It then unpacks `data.tar.gz`, writing the physical files directly to the root filesystem (e.g., `/usr/bin/`). Next, it executes the `postinst` (post-installation) script to start background daemons or generate application user accounts. Finally, it records the complete manifest of files deployed to `/var/lib/dpkg/info/` and marks the package as `ii` (Installed and Configured) in the main status database.

## Performance Notes

- `dpkg` operates strictly sequentially and locally. Installation speeds are entirely bottlenecked by single-core CPU tarball decompression speeds and local storage disk I/O (NVMe vs HDD).
- During package removal or purging, `dpkg` iterates through the thousands of filesystem path strings recorded in `/var/lib/dpkg/info/<pkg>.list` and issues individual `unlink()` system calls, making purging massive packages highly disk-intensive.

## Security Notes

- **Absolute Root Execution Risks:** Installing a `.deb` file via `dpkg -i` inherently executes the maintainer's `preinst` and `postinst` bash scripts with absolute `root` privileges. Downloading and installing a malicious `.deb` file from the internet grants the attacker instant, complete system compromise.
- **No Cryptographic Validation:** Unlike `apt`, which verifies GPG signatures on repository metadata before downloading, `dpkg` blindly trusts the raw file on disk. It performs absolutely no cryptographic signature checks on the `.deb` archive before executing it.

## Common Mistakes

- **Getting trapped in an interrupted state:** A server loses power during `dpkg -i`. **Why it's wrong:** The `/var/lib/dpkg/status` database is left locked and packages are marked "half-configured". Subsequent `apt` commands will refuse to run. You must manually execute `dpkg --configure -a` to force the internal engine to resume and finalize pending scripts.
- **Forgetting `apt install -f` after a failure:** Running `dpkg -i app.deb`, seeing dependency errors, and abandoning it. **Why it's wrong:** The package is left broken. You must immediately run `apt-get install -f` to instruct the higher-level APT resolver to download the missing dependencies from the internet and finalize the broken `dpkg` state.
- **Confusing Remove (`-r`) with Purge (`-P`):** **Why it's wrong:** Using `-r` deletes the binaries but deliberately leaves configuration files behind so users don't lose data. Reinstalling the app will reuse the old (potentially broken) configs. You must use `-P` to obliterate the configuration files.

## Best Practices

- When faced with deeply corrupted packages that `apt` refuses to touch, use `dpkg --remove --force-remove-reinstreq <pkg>` as a last-resort nuclear option to violently rip the package's state out of the database, freeing APT to operate again.
- Utilize `dpkg -S $(which command)` to rapidly determine exactly which Debian package is responsible for providing a specific CLI utility, ensuring reproducibility for infrastructure-as-code scripts.
- In locked-down CI environments, bypass interactive configuration prompts entirely by injecting `DEBIAN_FRONTEND=noninteractive dpkg -i package.deb`.

## Interview Questions

**Q:** A developer downloads a `.deb` file from a vendor and runs `dpkg -i vendor-app.deb`. The command fails, stating that `libssl1.1` and `libcurl4` are missing. Why didn't `dpkg` just download them automatically, and how do you resolve the error?
**A:** `dpkg` is the foundational, low-level execution engine for Debian packages. It is strictly an offline tool; it has no networking capabilities, no knowledge of remote repositories, and no dependency resolution algorithms. To resolve the error, you immediately execute `apt-get install -f` (fix-broken). The higher-level `apt` tool detects the broken state left by `dpkg`, reaches out to the internet, downloads the missing libraries, and finishes the installation.
**Q:** What is the functional and architectural distinction between invoking `dpkg -r` (remove) versus `dpkg -P` (purge) on an installed package?
**A:** `dpkg -r` uninstalls the software binaries but intentionally leaves the application's configuration files (typically residing in `/etc/`) entirely intact on the filesystem, assuming you might want to preserve your settings if you reinstall later. `dpkg -P` acts aggressively; it deletes the binaries and recursively deletes every configuration file and directory associated with the package, wiping its footprint completely from the system.
**Q:** How can you use `dpkg` to perform a reverse-lookup to verify if an arbitrary configuration file on the filesystem (e.g., `/etc/resolv.conf`) was installed by a tracked package, or if it was manually created by a user?
**A:** You execute `dpkg -S /etc/resolv.conf`. The utility searches its local manifest ledger located in `/var/lib/dpkg/info/`. If the file was deployed by a package, `dpkg` will output the name of the owning package (e.g., `systemd`). If it was manually created by a user or script, the command returns "no path found."

## Practice Problems

**Problem:** Install an offline package named `enterprise_agent.deb` directly from the current directory, and violently force the installation to proceed even if the package architecture does not perfectly match the host OS architecture.
**Hint:** Combine the installation flag with the absolute force override flag.
**Solution:** `dpkg -i --force-all enterprise_agent.deb` (The force-all flag ignores safety constraints and architecture checks, forcing the kernel to unpack the binary regardless of risk).
**Problem:** Extract an exhaustive list of every single absolute filesystem path that was written to disk when the `curl` package was installed.
**Hint:** Use the specific forward-lookup mapping flag targeted at the package's logical name.
**Solution:** `dpkg -L curl` (This reads the internal info files and prints every binary, library, and man-page directory deployed by the package).

## References

- [Debian Administrator's Handbook - Dpkg](https://debian-handbook.info/browse/stable/sect.dpkg.html)
- [Man Page for dpkg (Linux)](https://manpages.ubuntu.com/manpages/focal/man1/dpkg.1.html)
