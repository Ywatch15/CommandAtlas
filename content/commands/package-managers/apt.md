---
slug: apt
name: apt
aliases: []
category: package-managers
tags:
  - apt
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - install package on ubuntu
  - update system packages
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`apt` (Advanced Package Tool) is the high-level command-line interface for package management on Debian and Ubuntu Linux distributions.

## Why does it exist?

`apt` combines features from `apt-get` and `apt-cache` into an intuitive interface with colored progress bars for searching, installing, and updating software packages.

## Syntax

```bash
apt [options] command
```

## Flags

| Flag      | Description                                       | Example                |
| --------- | ------------------------------------------------- | ---------------------- |
| `update`  | Update package index from remote repositories     | `apt update`           |
| `upgrade` | Upgrade all installed packages to newest versions | `apt upgrade`          |
| `install` | Install specified package                         | `apt install -y nginx` |

## Examples

```bash
sudo apt update && sudo apt install -y curl git
```

> Refreshes package lists and installs `curl` and `git` without confirmation prompts.

## Real-World Scenarios

**Server provisioning**: Updating package indices and installing web servers during cloud instance initialization.

## When should it NOT be used?

- **Unattended scripting requiring stable CLI output contracts**: `apt-get` is recommended inside scripts over `apt` because `apt` CLI design is tuned for interactive terminal users.

## Alternatives

- **`apt-get`**: Low-level script-friendly package installation tool.

## How it works internally

`apt` interacts with `dpkg` to unpack, configure, and manage `.deb` binary package files while resolving dependency graphs.

## Performance Notes

Network repository updates depend on mirror bandwidth and local index caching.

## Security Notes

Always verify GPG repository keys and HTTPS sources in `/etc/apt/sources.list.d/`.

## Common Mistakes

- **Forgetting `apt update` before installing**: Can result in `404 Not Found` errors when fetching outdated package URLs.

## Best Practices

- Use `apt-get` with `-y` and `DEBIAN_FRONTEND=noninteractive` in automated Dockerfiles.

## Interview Questions

**Q:** What is the difference between `apt update` and `apt upgrade`?
**A:** `apt update` fetches the latest package lists from repositories; `apt upgrade` downloads and installs the updated software versions.

## Practice Problems

**Problem:** Search for packages matching keyword `nginx`.
**Solution:** `apt search nginx`

## References

- [Debian APT documentation](https://wiki.debian.org/Apt)
