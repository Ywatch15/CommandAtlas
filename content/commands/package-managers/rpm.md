---
slug: rpm
name: rpm
aliases: [Red Hat Package Manager]
category: package-managers
tags: [linux, red-hat, packages, installation, low-level, system-management]
difficulty: intermediate
supportedOS: [linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install local rpm file'
  - 'query installed rpm package'
  - 'find which rpm owns a file'
  - 'verify rpm signature'
  - 'force install package redhat'
relatedCommands: [dnf]
alternatives: [dnf, dpkg]
status: draft
---

## What is it?

`rpm` (RPM Package Manager) is a low-level, foundational package management utility utilized by Red Hat Enterprise Linux (RHEL), Fedora, CentOS, SUSE, and their derivatives. It interacts directly with a local database to install, uninstall, verify, and query individual software packages (`.rpm` files). Unlike high-level wrappers like `dnf` or `yum`, `rpm` does not possess the capability to reach out to internet repositories to automatically download and resolve missing dependencies.

## Why does it exist?

Before the creation of automated dependency resolvers, installing software on Linux meant compiling from source tarballs, leaving the administrator with no robust way to track which files belonged to which software, or to cleanly uninstall them. `rpm` was created by Red Hat in 1997 to introduce a strict packaging standard. It provides a standardized archive format (containing metadata, pre/post-install scripts, and compressed cpio payloads) and a local Berkeley DB (or modern SQLite) database tracking every single file on the system. While modern administrators use `dnf` for daily tasks, `rpm` remains the absolute core engine executing the actual file extractions and maintaining the cryptographic integrity of the system state.

## Syntax

```bash
rpm [OPTION...]
```

## Flags

| Flag        | Description                                                                                                                                                               | Example                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `-i`        | Installs a new `.rpm` package. Fails if the package is already installed or dependencies are missing.                                                                     | `rpm -i app.rpm`           |
| `-U`        | Upgrades a package. This installs the package if it does not exist, or upgrades it and removes the old version if it does. This is the preferred method for installation. | `rpm -Uvh app-2.0.rpm`     |
| `-e`        | Erases (uninstalls) a package from the system database and removes its associated files.                                                                                  | `rpm -e old_app`           |
| `-v`        | Verbose mode. Prints the name of the package being processed.                                                                                                             | `rpm -iv app.rpm`          |
| `-h`        | Hash mode. Prints exactly 50 hash marks (`#`) across the terminal as a progress bar during installation.                                                                  | `rpm -Uvh app.rpm`         |
| `-q`        | Query mode. The base flag required to interrogate the local RPM database.                                                                                                 | `rpm -q bash`              |
| `-a`        | (Query modifier) All. Queries every single package installed on the entire system. Often piped to `grep`.                                                                 | `rpm -qa                   | grep python` |
| `-i`        | (Query modifier) Info. Provides deep metadata about a package (version, vendor, build date, signature).                                                                   | `rpm -qi kernel`           |
| `-l`        | (Query modifier) List. Outputs every absolute file path installed by the specified package.                                                                               | `rpm -ql htop`             |
| `-f <file>` | (Query modifier) File. Performs a reverse lookup, determining exactly which package installed the specified file.                                                         | `rpm -qf /etc/passwd`      |
| `--nodeps`  | Forcefully bypasses dependency checks. Installs or erases a package even if it breaks other software on the system. Highly dangerous.                                     | `rpm -e --nodeps libssl`   |
| `--import`  | Imports a public GPG key into the RPM database, allowing it to verify the cryptographic signatures of downloaded packages.                                                | `rpm --import RPM-GPG-KEY` |

## Examples

```bash
rpm -Uvh [https://dev.mysql.com/get/mysql80-community-release-el8-5.noarch.rpm](https://dev.mysql.com/get/mysql80-community-release-el8-5.noarch.rpm)
```

> The standard installation pattern for third-party software. By providing a direct URL, `rpm` downloads the package and upgrades/installs (`-U`) it, providing verbose output (`-v`) and a hash progress bar (`-h`). Because this specific RPM only drops `.repo` text files into `/etc/yum.repos.d/` rather than complex binaries, it doesn't suffer from dependency failures.

```bash
rpm -qa | sort
```

> Outputs a comprehensive, alphabetically sorted list of every single package installed on the system, including exact version and architecture strings (e.g., `zlib-1.2.11-21.el8.x86_64`).

```bash
rpm -qf /usr/bin/htpasswd
```

> The essential reverse-lookup command. If an administrator finds an executable but needs to know its origin, they pass the absolute path to this command. The database reveals that the binary is owned by the `httpd-tools` package.

```bash
rpm -V openssh-server
```

> The verification command. `rpm` scans every file installed by the `openssh-server` package and hashes them. It compares the live SHA256 hashes, file sizes, and ownership permissions against the original values recorded in the RPM database during installation. If a file was modified (e.g., an attacker backdoored the binary, or an admin edited a config), `rpm` outputs a coded string indicating exactly what changed.

```bash
rpm -qpR ./downloaded_app.rpm
```

> Probing an uninstalled package. The `-p` flag tells `rpm` to query a physical `.rpm` file on disk rather than the installed database. The `-R` flag asks for Requirements. It lists the exact libraries (like `libc.so.6`) this package will demand if you attempt to install it.

## Real-World Scenarios

**Emergency Package Recovery**

```bash
rpm -e --nodeps glibc  # (Catastrophic user error)
# System is broken. Boot from Rescue CD, mount drives, and inject the package bypassing restrictions.
rpm --root /mnt/sysimage -Uvh /mnt/usb/glibc-2.28-164.el8.x86_64.rpm
```

> If a critical library is accidentally deleted, high-level tools like `dnf` will break entirely. `rpm` is a statically linked, low-level tool. By booting into a rescue environment and passing the `--root` flag, an administrator forces `rpm` to operate on the broken, mounted system chroot, forcibly reinstalling the missing foundational RPM and reviving the OS.

**Extracting Files Without Installation**

```bash
rpm2cpio my-app.rpm | cpio -idmv
```

> Sometimes an administrator needs a single configuration file from an RPM, but doesn't want to install the entire software suite on their workstation. Using the companion tool `rpm2cpio`, they convert the `.rpm` payload into a standard `cpio` archive stream, and pipe it to `cpio` to extract the internal files directly into the current directory safely.

## When should it NOT be used?

- **Daily Software Installation:** **Do not use `rpm -i` to install software from the internet.** If you download an RPM for Chrome or VS Code, it will likely rely on dozens of X11 and GTK libraries. `rpm` will instantly fail and print a list of missing dependencies, leaving you to manually hunt them down. Always use `dnf install ./app.rpm`; `dnf` will wrap the RPM, read the requirements, and automatically download the missing libraries from the Red Hat repositories.
- **System Upgrades:** **Never use `rpm` to upgrade a system.** Updating the kernel, `glibc`, and systemd requires massive dependency orchestration and transaction tracking. `rpm` cannot do this. Always use `dnf upgrade`.

## Alternatives

- **`dnf` / `yum`:** **Best for daily use.** High-level package managers. They resolve dependencies automatically via HTTP repositories, but ultimately shell out to `rpm` to perform the actual disk installations.
- **`dpkg`:** **The Debian equivalent.** The exact functional analog to `rpm` used in Ubuntu and Debian environments (managing `.deb` files).

## How it works internally

An `.rpm` file is a complex binary archive. It contains a Lead (magic numbers for identification), a Signature (GPG cryptographic signatures), a Header (containing all metadata, dependencies, and pre/post install bash scripts), and a Payload (the actual files compressed using `xz` or `zstd` into a `cpio` archive).

When you run `rpm -i app.rpm`, `rpm` performs several strict phases:

1.  **Verification:** Checks the cryptographic signature of the file against imported GPG keys in the RPM database.
2.  **Dependency Check:** Reads the Header's `Provides` and `Requires` fields. It queries the local database (`/var/lib/rpm/`) to ensure all required libraries exist. If they don't, it halts.
3.  **Pre-install Scripts:** Executes the `%pre` bash script embedded in the RPM (e.g., creating a required `mysql` user account before unpacking files).
4.  **Extraction:** Unpacks the `cpio` payload, placing the physical binaries and configuration files into their absolute paths across the filesystem (e.g., `/usr/bin/app`).
5.  **Post-install Scripts:** Executes the `%post` script (e.g., reloading `systemd` or triggering `ldconfig`).
6.  **Database Update:** Inserts a new record into the local SQLite (modern) or Berkeley DB (legacy) tracking database, logging file hashes, permissions, and package ownership.

## Performance Notes

- **Database Corruption:** Historically, the Berkeley DB backend used by `rpm` was prone to locking up or corrupting if an installation was forcefully killed (`SIGKILL`) or power was lost mid-transaction. Running `rpm --rebuilddb` was frequently necessary. Modern RHEL 9 and Fedora releases migrated the backend to `SQLite` and `ndb`, drastically improving ACID transaction safety and query performance.

## Security Notes

- **Script Injection (`--noscripts`):** Installing an RPM inherently executes its embedded `%pre` and `%post` bash scripts as root. If you are auditing a suspicious `.rpm` file and want to install the files _without_ executing arbitrary code, you must pass the `--noscripts` flag.
- **GPG Checking:** By default, `rpm` verifies signatures. If you attempt to install a package downloaded from an untrusted source lacking a signature, `rpm` will throw a `NOKEY` warning. You can force installation with `--nosignature`, but doing so compromises the cryptographic supply chain.

## Common Mistakes

- **Using `-i` instead of `-U` for upgrades**
  - _Mistake:_ You have `app-1.0.rpm` installed. You download `app-2.0.rpm` and run `rpm -ivh app-2.0.rpm`.
  - _Why:_ `rpm` treats `-i` strictly as a new installation. Because `app-1.0` already claims ownership of `/usr/bin/app`, the installation violently fails with a file conflict error. You must use `-U` (Upgrade), which instructs `rpm` to gracefully install `2.0` and then erase `1.0` in a single transaction. It is standard practice to _always_ use `-Uvh` even for fresh installations.
- **Overusing `--nodeps`**
  - _Mistake:_ Encountering a dependency error, getting frustrated, and adding `--nodeps` to force the package in.
  - _Why:_ The software physically will not run. When you type the command to execute it, the kernel's dynamic linker will instantly crash with `error while loading shared libraries`. Worse, you have now desynchronized your system state; the RPM database thinks the system is healthy, making future `dnf` updates a nightmare to reconcile.

## Best Practices

- **Always use `dnf` for local files:** In modern RHEL/Fedora, the command `dnf install ./downloaded_app.rpm` is vastly superior to `rpm -Uvh ./downloaded_app.rpm`. `dnf` will read the local file, realize it needs a missing library, connect to Red Hat's servers, and download the library automatically.
- **Rely on `rpm -V` for auditing:** If a server behaves strangely and you suspect a core utility like `bash` or `sshd` was modified by a rootkit, `rpm -V bash` is your first line of defense. It instantly verifies the cryptographic hashes of every file in the package against the unalterable RPM database.

## Interview Questions

**Q: You need to know which package installed the `/etc/ssh/sshd_config` file, and then you want to list every other file that was installed by that same package. Describe the two `rpm` commands required to do this.**
**A:** First, use the reverse file query: `rpm -qf /etc/ssh/sshd_config`. This will return the owning package, likely `openssh-server`. Next, use the list query targeting that package name: `rpm -ql openssh-server`. This will output every absolute file path managed by that package.

**Q: A developer provides you with a custom `.rpm` file they built. You want to see the pre-install and post-install bash scripts embedded inside it before you install it as root. How can you extract and view these scripts?**
**A:** You can query the physical package file without installing it by using the package query flag `-p`, combined with the script query flag `--scripts`. The full command is `rpm -qp --scripts ./custom-app.rpm`. This will dump the raw bash code to your terminal for auditing.

## Practice Problems

**Problem:** You are connected to a legacy CentOS 7 server. You downloaded a diagnostic tool, `diag.rpm`. You need to install it, showing a hash progress bar and verbose output. You know for a fact it has no dependencies.
**Hint:** Combine the Upgrade, Verbose, and Hash flags.
**Solution:**

```bash
rpm -Uvh diag.rpm
```

**Problem:** A security alert states that a specific version of the `openssl` package has a vulnerability. Write the command to query the local database to find out exactly what version and architecture of `openssl` is currently installed on the system.
**Hint:** Use the query flag explicitly targeting the package name.
**Solution:**

```bash
rpm -q openssl
```

## References

- [rpm(8) - Linux man page](https://linux.die.net/man/8/rpm)
- [RPM Packaging Guide](https://rpm-packaging-guide.github.io/)
