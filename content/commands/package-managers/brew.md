---
slug: brew
name: brew
aliases: [homebrew]
category: package-managers
tags: [package-manager, macos, linuxbrew, open-source, install]
difficulty: beginner
supportedOS: [macos, linux]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install package on macos'
  - 'update homebrew packages'
  - 'install macos GUI app command line'
  - 'search for software macos'
  - 'manage homebrew services'
relatedCommands: [apt, dnf, curl]
alternatives: [apt, dnf]
status: draft
---

## What is it?

`brew` (Homebrew) is the most popular third-party package manager for macOS (and increasingly, Linux via Linuxbrew). It automates the process of fetching, compiling, and installing open-source UNIX tools and graphical macOS applications into isolated directories, seamlessly symlinking their binaries into the user's `PATH`.

## Why does it exist?

Unlike standard Linux distributions, macOS (Darwin) does not ship with a native, robust command-line package manager for open-source tools. Developers historically had to download raw source code, run `./configure && make && sudo make install`, and pollute their core system directories (`/usr/bin`), which frequently broke during macOS upgrades. Homebrew exists to solve this by providing a clean, sandboxed package manager that installs everything under `/opt/homebrew` (or `/usr/local` on Intel Macs) entirely in user-space, explicitly refusing to use `sudo` and protecting the host OS.

## Syntax

```bash
brew <command> [--verbose|-v] [options] [formula|cask ...]
```

## Flags

| Flag                        | Description                                                                                                          | Example                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `--cask`                    | Explicitly tells Homebrew to install a graphical macOS application rather than a CLI tool.                           | `brew install --cask google-chrome`         |
| `-f`, `--force`             | Forces operations, such as overwriting existing symlinks or bypassing safety checks.                                 | `brew link --force python@3.9`              |
| `-v`, `--verbose`           | Prints verbose debugging output, including the raw `make` compilation logs.                                          | `brew install -v wget`                      |
| `--ignore-dependencies`     | Skips installing any prerequisite packages required by the requested formula.                                        | `brew install --ignore-dependencies node`   |
| `--no-quarantine`           | Bypasses macOS Gatekeeper quarantine restrictions when installing Casks.                                             | `brew install --cask --no-quarantine slack` |
| `--dry-run`, `-n`           | Simulates an installation or cleanup, outputting what would be deleted or modified.                                  | `brew cleanup -n`                           |
| `--greedy`                  | (With `upgrade`) Forces Homebrew to update Casks even if they possess native auto-updaters.                          | `brew upgrade --cask --greedy`              |
| `-s`, `--build-from-source` | Forces Homebrew to download raw source code and compile it locally instead of using pre-compiled binaries (bottles). | `brew install -s htop`                      |
| `--display-times`           | Prints the execution time elapsed at the end of the installation process.                                            | `brew install --display-times go`           |
| `--caskroom <dir>`          | Specifies a custom directory to install Cask applications into rather than `/Applications`.                          | `brew install --cask vlc --caskroom=~/Apps` |

## Examples

```bash
brew update && brew upgrade
```

> This is the standard maintenance loop. `brew update` fetches the latest package definitions (Formulae) from GitHub, and `brew upgrade` downloads and applies the latest versions for all software currently installed on the system.

```bash
brew install jq
```

> This downloads the pre-compiled binary (bottle) for the `jq` JSON processor, extracts it into the Homebrew Cellar directory, and creates a symlink in `bin/` so the command is immediately available in the terminal.

```bash
brew install --cask visual-studio-code
```

> The `--cask` flag extends Homebrew's capability to manage native macOS graphical GUI applications. It downloads the `.dmg` or `.zip` file, extracts the `.app` bundle, and moves it directly into the `/Applications` folder.

```bash
brew search "database browser"
```

> This queries the local cache and the Homebrew API for any CLI Formulae or GUI Casks whose names or descriptions match the query string, helping users discover software without knowing exact repository names.

```bash
brew cleanup --prune=all
```

> Over time, Homebrew accumulates outdated versions of packages and massive download caches. This command forcefully scrubs the cache and deletes old, unlinked versions of installed software, frequently reclaiming gigabytes of disk space.

## Real-World Scenarios

**Managing Background Daemons via Homebrew Services**

```bash
brew install postgresql@14
brew services start postgresql@14
```

> Homebrew includes a `services` integration that interfaces directly with macOS `launchd`. Developers use this to install databases and instantly configure them to run persistently in the background across reboots as standard user processes.

**Bootstrapping New MacBooks**

```bash
curl -fsSL [https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh](https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh) | bash
brew install git awscli terraform
brew install --cask slack docker iterm2
```

> IT departments and software engineers completely automate the onboarding of fresh Apple laptops. Instead of clicking through dozens of website installers, a single bash script utilizes `brew` to install the entire engineering toolchain in minutes.

**Pinning Critical Legacy Dependencies**

```bash
brew install python@3.8
brew pin python@3.8
```

> To prevent automated `brew upgrade` runs from accidentally migrating a local environment to Python 3.10 and breaking legacy development projects, developers use `brew pin` to freeze specific formulae at their current version.

## When should it NOT be used?

- **System-level daemon management on Linux production servers:** **Reason:** While `Linuxbrew` exists, native package managers like `apt` or `dnf` integrate directly with `systemd` and the kernel. Using Homebrew on production Linux servers bypasses OS-level security patching. **Use instead:** `apt` or `dnf`.
- **Deploying complex, isolated Python/Node.js application environments:** **Reason:** Homebrew manages global user-space binaries. Installing language-specific libraries globally via `brew` leads to severe environment conflicts. **Use instead:** `pyenv` + `pip`, or `nvm` + `npm`.

## Alternatives

- **`MacPorts`:** The older macOS package manager. **Tradeoff:** MacPorts isolates its installations deeply in `/opt/local` and strictly compiles from source rather than relying on pre-built binaries. It is highly robust but significantly slower to install packages than Homebrew.
- **`Nix`:** Purely functional package manager. **Tradeoff:** Nix guarantees absolute reproducibility by installing packages into cryptographically hashed directories, allowing multiple conflicting versions of software to coexist seamlessly, but it carries a massively steep learning curve compared to `brew`.

## How it works internally

Homebrew is built fundamentally on top of **Git** and **Ruby**.

A package definition in Homebrew is called a **Formula** (a Ruby script defining dependencies, download URLs, and compilation instructions). These Formulae are stored in Git repositories called **Taps** (the default being `homebrew/core`).

When you run `brew install wget`, Homebrew reads the `wget.rb` formula. Instead of compiling from source (which is slow), Homebrew's servers pre-compile the software for various macOS and Linux architectures. These pre-compiled binaries are called **Bottles**. Homebrew downloads the Bottle tarball and extracts it into the **Cellar** (e.g., `/opt/homebrew/Cellar/wget/1.21.3/`).

Because paths in the Cellar contain explicit version numbers, the binaries aren't natively in your `$PATH`. To fix this, Homebrew dynamically creates symbolic links (symlinks) from the executable files in the Cellar directly into `/opt/homebrew/bin/`. If you install a **Cask** (GUI app), it bypasses the Cellar and moves the `.app` bundle straight into your `/Applications` directory.

## Performance Notes

- Running `brew update` executes a `git fetch` across all installed Taps. On slow networks, or with massive taps, this blocks execution for tens of seconds. You can temporarily bypass this automatic behavior by exporting `HOMEBREW_NO_AUTO_UPDATE=1` in your shell.
- Installing software lacking a pre-compiled Bottle for your specific OS/Architecture forces Homebrew to fall back to downloading raw C/C++ source code and running `make` locally, which spikes CPU usage and can take hours for heavy packages like `gcc` or `llvm`.

## Security Notes

- **The Anti-Sudo Philosophy:** Homebrew explicitly refuses to run as `root`. If you type `sudo brew install`, it will throw a fatal error. This is a deliberate security design preventing third-party build scripts from maliciously or accidentally destroying core macOS operating system files.
- **Gatekeeper Quarantine Bypass:** macOS assigns a `com.apple.quarantine` extended attribute to software downloaded from the internet, forcing a security popup upon execution. `brew install --cask` handles this naturally, but appending `--no-quarantine` explicitly strips this attribute, which is useful for automation but disables Apple's malware validation.

## Common Mistakes

- **Messing with permissions in `/usr/local` or `/opt/homebrew`:** Running `sudo chown` or `chmod` to fix a Homebrew error. **Why it's wrong:** Homebrew relies on strict user-space permissions. Manual permission hacking breaks the linking engine entirely. If permissions are broken, run `brew doctor` and follow its exact remediation commands.
- **Using `brew upgrade` instead of `brew update` to refresh the catalog:** **Why it's wrong:** `update` fetches the new definitions from GitHub. `upgrade` actually downloads and overwrites your installed software binaries.
- **Ignoring the `brew doctor` warnings:** **Why it's wrong:** `brew doctor` diagnoses unlinked binaries, broken symlinks, and PATH issues. Ignoring its output leads to "Command not found" errors even when a package says it installed successfully.

## Best Practices

- Regularly execute `brew doctor` to audit your local installation for broken symlinks, conflicting Python versions, or PATH pollution.
- Use `brew bundle` combined with a `Brewfile` to declaratively manage your workstation. A `Brewfile` is a text file listing all your packages; running `brew bundle install` reads the file and guarantees your system matches the list exactly.
- Clean up frequently. `brew` preserves old versions of packages in the Cellar to allow rollbacks. Run `brew cleanup` monthly to prevent Homebrew from silently consuming 50GB+ of local NVMe storage.

## Interview Questions

- _Query:_ What is the functional difference between a Homebrew **Formula**, a **Bottle**, and a **Cask**?
  - _A:_ A **Formula** is the Ruby script that defines how to download, compile, and install a piece of CLI software. A **Bottle** is a pre-compiled binary archive of that Formula, allowing Homebrew to skip local source compilation and install the software instantly. A **Cask** is an extension of Homebrew specifically designed to download and install native macOS graphical GUI applications (like Google Chrome or Slack) directly into the `/Applications` folder.
- _Query:_ Why does Homebrew intentionally crash and refuse to execute if a user runs it via `sudo brew install <package>`?
  - _A:_ Homebrew is designed to operate entirely in user-space, managing files inside `/opt/homebrew` (or `/usr/local`) owned by the executing user. Refusing to run as `root` serves as a critical safety boundary, ensuring that poorly written or malicious third-party installation scripts cannot access or corrupt the protected, core macOS operating system directories.
- _Query:_ A developer runs `brew install myapp`, the terminal says the installation succeeded, but when they type `myapp`, they get a "Command not found" error. What is the most likely architectural cause within Homebrew?
  - _A:_ Homebrew installs all binaries into isolated, versioned directories within the "Cellar". It then creates symlinks from the Cellar into `/opt/homebrew/bin/`. If the command fails, either the symlinking process failed (which `brew link myapp` can fix), or the user's shell `$PATH` environment variable does not include `/opt/homebrew/bin/`. Running `brew doctor` will explicitly flag both of these issues.

## Practice Problems

- _Problem:_ Install the graphical application `docker` (Docker Desktop) bypassing macOS Gatekeeper quarantine restrictions entirely so it launches without prompts.
  - _Hint:_ Combine the installation command with the cask flag and the quarantine bypass flag.
  - _Solution:_ `brew install --cask --no-quarantine docker` (This downloads the GUI application, strips the Apple extended attributes, and moves it to Applications).
- _Problem:_ Audit your Homebrew installation for outdated metadata, upgrade all currently installed software packages, and forcibly delete all old versions and cached downloads to reclaim disk space.
  - _Hint:_ Chain three distinct Homebrew commands sequentially: update, upgrade, and the aggressive cache sweeping command.
  - _Solution:_ `brew update && brew upgrade && brew cleanup --prune=all` (This is the definitive maintenance loop for ensuring system health and storage hygiene).

## References

- [Homebrew Official Documentation](https://docs.brew.sh/)
- [Homebrew GitHub Repository](https://github.com/Homebrew/brew)
