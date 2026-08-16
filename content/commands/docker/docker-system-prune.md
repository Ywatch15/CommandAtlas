---
slug: docker-system-prune
name: docker system prune
aliases: []
category: docker
tags:
  - docker
  - cleanup
  - maintenance
  - storage
  - garbage-collection
  - devops
difficulty: beginner
supportedOS:
  - linux
  - macos
  - windows
  - unix
supportedShells:
  - bash
  - zsh
  - powershell
  - cmd
  - sh
intentPhrases:
  - clean up docker disk space
  - remove all unused docker data
  - delete dangling docker images
  - clear docker cache
  - free up docker storage
relatedCommands:
  - docker-rm
  - docker-rmi
  - docker-volume
alternatives:
  - docker-rmi
status: draft
---

## What is it?

`docker system prune` is a sweeping, comprehensive garbage collection utility for the Docker daemon. Instead of targeting specific containers or images, it evaluates the entire host environment and deletes all dangling and unreferenced objects—including stopped containers, unused networks, dangling images, and build caches—reclaiming significant amounts of disk space in a single execution.

## Why does it exist?

Over time, continuous deployment cycles and local developer iterations generate massive amounts of orphaned data. Rebuilding an image dozens of times leaves behind invisible "dangling" image layers. Running short-lived test containers leaves behind stopped instances and custom bridge networks. Without aggressive management, this cruft eventually exhausts the host machine's disk storage or inode limits, causing production outages. `docker system prune` exists to provide a native, safe "reset button." It delegates the complex dependency-graph calculations to the daemon, ensuring that only data definitively detached from actively running workloads is purged.

## Syntax

```bash
docker system prune [OPTIONS]
```

## Flags

| Flag            | Description                                                                                                                                    | Example                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `-a`, `--all`   | Expands the scope of image deletion. Removes _all_ unused images (not just dangling ones) that are not currently bound to an active container. | `docker system prune -a`                     |
| `--volumes`     | By default, volumes are preserved to prevent catastrophic database loss. This flag forces the deletion of all unattached persistent volumes.   | `docker system prune --volumes`              |
| `-f`, `--force` | Bypasses the interactive `y/N` confirmation warning. Essential for scheduling pruning within automated cron jobs or CI/CD pipelines.           | `docker system prune -f`                     |
| `--filter`      | Narrows the pruning scope based on specific conditions, such as retaining objects younger than a specific time duration (e.g., `until=24h`).   | `docker system prune --filter "until=168h"`  |
| `-H`, `--host`  | _(Global Docker Flag)_ Overrides the socket to execute the garbage collection on a remote Docker daemon via TCP or SSH.                        | `docker -H tcp://10.0.1.5:2375 system prune` |
| `--context`     | _(Global Docker Flag)_ Uses a pre-configured connection context to target a remote Docker Engine for pruning.                                  | `docker --context prod-cluster system prune` |
| `--help`        | Prints a brief help message displaying usage syntax and available flags.                                                                       | `docker system prune --help`                 |

## Examples

```bash
docker system prune
```

> The standard, safest invocation. It prompts the user for confirmation, then deletes all stopped containers, networks not used by at least one container, dangling images (layers with no tag), and dangling build caches. Crucially, it leaves tagged images and all volumes intact.

```bash
docker system prune -a -f
```

> The aggressive CI/CD cleanup pattern. Bypasses the confirmation prompt (`-f`) and forcefully deletes _all_ images (`-a`) that aren't actively running. This is run nightly on Jenkins or GitLab runners to guarantee the environment starts fresh every morning.

```bash
docker system prune --volumes
```

> Extends the standard prune to include persistent storage. The daemon evaluates all volumes in `/var/lib/docker/volumes/` and permanently deletes any volume that is not currently mounted to an existing container.

```bash
docker system prune -a --filter "until=24h"
```

> Performs a time-gated garbage collection. It deletes all unused containers, networks, and images, but _only_ if they were created more than 24 hours ago. This ensures developers don't lose the base images they downloaded this morning for active work.

## Real-World Scenarios

**Nightly Production Host Maintenance**

```bash
# Inside /etc/crontab
0 3 * * * root docker system prune -f
```

> Production host machines running high-churn microservices occasionally accumulate stopped containers or detached networks from failed orchestrator deployments. System administrators install this command as a nightly cron job to silently sweep away the cruft at 3:00 AM, ensuring disk usage metrics remain stable over years of operation.

**Recovering a Paralyzed Docker Desktop**

```bash
docker system prune -a --volumes -f
```

> Local developers working heavily with containerized databases and multi-container environments often run their laptops entirely out of disk space, paralyzing Docker Desktop. This "nuclear option" completely resets their local environment without needing to reinstall Docker. It destroys all stopped containers, unused networks, unmounted databases, and every cached image, instantly reclaiming dozens of gigabytes of disk space.

## When should it NOT be used?

- **Active Stateful Development:** **Do not use `--volumes` lightly.** If you have a local PostgreSQL container that you stopped for the weekend, running `prune --volumes` will permanently delete your development database. Volumes are excluded by default for exactly this reason.
- **Air-Gapped Environments:** **Use `-a` with extreme caution without internet access.** If you are on an air-gapped machine or a submarine, running `docker system prune -a` deletes all base images (like `ubuntu` or `alpine`) that aren't running at that exact moment. You will be completely unable to run new workloads until you reconnect to a registry to re-download the images.

## Alternatives

- **Granular Pruning Commands:** **Best for targeted cleanup.** Instead of the monolithic `system prune`, use `docker image prune -a`, `docker container prune`, `docker volume prune`, or `docker network prune` to surgically target specific subsystems without touching others.
- **Kubernetes Native Garbage Collection:** **Best for K8s.** In Kubernetes, do not run Docker pruning commands manually on the worker nodes. The Kubelet automatically manages image and container eviction based on node disk pressure thresholds (`imageGCHighThresholdPercent`).

## How it works internally

`docker system prune` acts as an orchestrator for multiple smaller API endpoints. When executed, the CLI sends an HTTP POST to `/containers/prune`, `/networks/prune`, `/images/prune`, and `/build/prune` sequentially.

The Docker daemon executes dependency graph calculations for each subsystem:

1.  **Containers:** Iterates through its metadata database. Any container not in the `Running` or `Paused` state has its isolated filesystem unlinked and metadata destroyed.
2.  **Networks:** Iterates through user-defined bridges. If the bridge's `Endpoints` array is empty (no containers attached), the daemon commands the Linux kernel to destroy the virtual bridge interface and `iptables` NAT rules.
3.  **Images:** The daemon calculates the reference count of all image layers. If an image is "dangling" (reference count is 0 and it has no `<repo>:<tag>` associated with it), the physical `overlay2` layers are unlinked from disk. If `-a` is passed, it further deletes any tagged image that is not explicitly associated with the image hash of a surviving container.
4.  **Volumes (if `--volumes`):** Iterates over the volume manager. Unlinks the physical host directories of any volume not referenced by a surviving container.

By handling this logic server-side, Docker guarantees that it is mathematically impossible to accidentally delete a network or layer that is currently supporting an actively running application.

## Performance Notes

- **Intensive Disk I/O:** Pruning a host that hasn't been cleaned in months can involve the physical `unlink()` system calls for hundreds of thousands of files across deeply nested `overlay2` directories. This causes massive spikes in disk I/O and can momentarily degrade performance for actively running, I/O-sensitive databases on the same host.
- **Cache Invalidation:** Running `-a` aggressively clears the build cache. The next time you run `docker build` or `docker compose up`, it will be excruciatingly slow as Docker must re-download every base image from the internet and recompile every instruction from scratch.

## Security Notes

- **Residual Data Shredding:** Like standard `rm`, `prune` only removes file pointers (inodes). It does not securely overwrite the physical disk blocks. Sensitive data left inside deleted containers or volumes might be recoverable via forensic tools if the underlying host partition is unencrypted.
- **Privileged Execution:** The command requires Docker socket access. While the command itself doesn't launch malicious processes, an attacker could use `prune` as a destructive denial-of-service tool to wipe a host's entire image cache, paralyzing rapid scaling capabilities.

## Common Mistakes

- **Accidental image purge**
  - _Mistake:_ Using `-a` thinking it means "All dangling items", and wiping out dozens of tagged base images you spent hours downloading over a slow VPN connection.
  - _Why:_ The standard `prune` already deletes dangling items. The `-a` (all) flag specifically instructs the daemon to delete _valid, tagged_ images if they aren't actively being executed.
- **Misunderstanding time filters**
  - _Mistake:_ Running `docker system prune --filter "until=24h"` expecting it to delete a container that was stopped 2 hours ago.
  - _Why:_ The `until` filter evaluates the _creation_ timestamp of the object, not the _deletion_ or _stop_ timestamp. If the container was created 2 days ago, ran continuously, and was stopped 2 hours ago, the prune command will delete it, which might not be the expected behavior.

## Best Practices

- **Standardize CI/CD Hygiene:** In shared Jenkins or GitLab CI worker nodes, always run `docker system prune -f --volumes` as a cleanup step in the post-execution phase. This mathematically guarantees isolation, preventing state or cache pollution from leaking between jobs.
- **Prune before Image Backups:** If you are migrating a server and plan to tarball the `/var/lib/docker` directory (not recommended, but occasionally necessary), always run a standard `docker system prune` first to reduce the transfer payload from 100GB of cruft to 5GB of actual workloads.

## Interview Questions

**Q: Explain the exact difference between the execution of `docker system prune` and `docker system prune -a`.**
**A:** Standard `docker system prune` only deletes images that are "dangling"—meaning they have lost their human-readable tags and are completely unreferenced. It preserves unused but tagged images (e.g., `ubuntu:latest`). Appending `-a` expands the scope to delete _all_ images on the system, dangling or tagged, unless that exact image hash is actively being used by a container currently on the system.

**Q: You run `docker system prune --volumes`, but a specific volume you know is unused refuses to delete. Why might the daemon be protecting it?**
**A:** The volume might be attached to a stopped container. Even if a container is not actively running, Docker preserves its entire state, including its volume attachments. `prune` only deletes volumes that are not attached to _any_ container, running or stopped. Alternatively, the volume might have been created with a custom label and the command was run with a filter excluding that label, or a third-party plugin is locking the volume.

## Practice Problems

**Problem:** You are writing an automated cleanup script. You need the script to silently remove all stopped containers, unused networks, and dangling images, but you must ensure it does not prompt for user confirmation.
**Hint:** Use the flag that bypasses safety prompts.
**Solution:**

```bash
docker system prune -f
```

**Problem:** Your development environment is completely out of space. You need a destructive "reset". Write the command to forcefully and silently delete all stopped containers, unused networks, ALL unused images (even tagged ones), and ALL unattached persistent volumes.
**Hint:** Combine the "all" images flag, the volumes flag, and the force flag.
**Solution:**

```bash
docker system prune -a --volumes -f
```

## References

- [Docker CLI Reference: docker system prune](https://docs.docker.com/engine/reference/commandline/system_prune/)
- [Clean up Docker resources](https://docs.docker.com/config/pruning/)
