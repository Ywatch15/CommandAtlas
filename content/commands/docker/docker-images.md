---
slug: docker-images
name: docker images
aliases:
  - docker image ls
  - docker image list
category: docker
tags:
  - docker
  - images
  - inspection
  - storage
  - local-registry
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
  - sh
intentPhrases:
  - list local docker images
  - check downloaded docker images
  - find docker image size
  - list dangling images
  - view cached docker images
relatedCommands:
  [docker-rmi, docker-build, docker-pull, docker-run, docker-load, docker-save-load, docker-tag]
alternatives: []
status: draft
---

## What is it?

`docker images` is a command-line utility used to list all top-level Docker images currently stored in the local Docker daemon's cache. It displays a tabular summary including the repository name, assigned tags, unique image IDs, creation age, and total disk footprint for each image.

## Why does it exist?

Over time, pulling new containers and building software iteratively causes the local Docker host to accumulate hundreds of image versions, intermediate layers, and untagged builds. These consume massive amounts of disk space. `docker images` exists to provide an auditing interface for local storage, allowing developers and administrators to inspect their local registry cache, identify obsolete or dangling images, and manage host storage hygiene.

## Syntax

```bash
docker images [OPTIONS] [REPOSITORY[:TAG]]
```

## Flags

| Flag                       | Description                                                                              | Example                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `-a`, `--all`              | Shows all images, including intermediate, hidden layers used during builds.              | `docker images -a`                                    |
| `-q`, `--quiet`            | Only displays the numeric image IDs, suppressing all other tabular columns.              | `docker images -q`                                    |
| `-f`, `--filter <key=val>` | Filters the output based on specific conditions (e.g., dangling, before, reference).     | `docker images -f "dangling=true"`                    |
| `--format <string>`        | Formats the output using a Go template for customized data extraction.                   | `docker images --format "{{.Repository}}: {{.Size}}"` |
| `--no-trunc`               | Disables output truncation, revealing full 64-character SHA-256 image IDs.               | `docker images --no-trunc`                            |
| `--digests`                | Displays the exact SHA-256 content digest signature corresponding to the image manifest. | `docker images --digests`                             |
| `--help`                   | Outputs brief usage documentation and supported command-line options.                    | `docker images --help`                                |

## Examples

```bash
docker images
```

> This lists all top-level (tagged) images currently stored on the host machine, displaying their repository name, tag, short ID, creation date, and total size in a clean table.

```bash
docker images ubuntu
```

> This scopes the query to display only images matching the specific repository name `ubuntu`, listing all available tags (e.g., `latest`, `20.04`, `22.04`) stored locally for that repository.

```bash
docker images -f "dangling=true" -q
```

> This filters the output for "dangling" images (images with no repository name and no tag, marked as `<none>:<none>`) and outputs only their IDs (`-q`), making it ideal for piping into cleanup commands.

```bash
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

> This utilizes a Go template to render a customized terminal table that strips away the Image ID and Creation Date columns, focusing strictly on repository names and disk size footprints.

```bash
docker images --digests
```

> This expands the standard output to include the `DIGEST` column, showing the immutable SHA-256 manifest hash which ensures cryptographically verified image provenance.

## Real-World Scenarios

**Automated Host Disk Cleanup**

```bash
docker images -f "dangling=true" -q | xargs -r docker rmi
```

> Infrastructure maintenance scripts and CI runners execute this pipeline to surgically identify and delete intermediate, untagged "dangling" images left behind by iterative `docker build` processes, freeing up gigabytes of disk space without deleting actively tagged cache.

**Auditing Base Image Age for Security Compliance**

```bash
docker images --format "{{.Repository}}:{{.Tag}} - {{.CreatedAt}}" | grep node
```

> Security engineers query the local cache using Go templates to extract absolute creation timestamps for all Node.js base images, identifying stale runtimes that require updating to receive CVE patches.

**Identifying Cryptographic Image Signatures**

```bash
docker images my-app:production --digests
```

> Site Reliability Engineers (SREs) verify that the local image pulled for production precisely matches the expected cryptographic SHA-256 digest listed in the security manifest to prevent supply chain tampering.

## When should it NOT be used?

- **Searching for remote images on Docker Hub:** **Reason:** `docker images` only queries the local storage cache on the host machine; it does not reach out to the internet to find new packages. **Use instead:** `docker search`.
- **Auditing live container disk usage:** **Reason:** `docker images` shows the size of the immutable, read-only image blueprints, not the writable disk space consumed by live, running containers. **Use instead:** `docker ps -s` or `docker system df`.

## Alternatives

- **`docker image ls`:** The modern, explicit alias. **Tradeoff:** It is functionally identical and aligns with Docker's newer management CLI structure, but `docker images` remains the pervasive standard due to muscle memory.
- **`docker system df`:** Displays overall Docker disk usage. **Tradeoff:** It provides a high-level aggregate summary of space consumed by images, containers, and volumes, rather than listing specific granular images.

## How it works internally

When you execute `docker images`, the CLI sends an HTTP `GET /images/json` request via the local UNIX socket to the Docker daemon.

The daemon queries its configured storage driver (such as `overlay2`, `btrfs`, or `zfs`) and its internal graph database stored in `/var/lib/docker/image/`. By default, the daemon filters the response to include only "top-level" images—those that have been explicitly assigned a repository name and tag, or those that are the leaf nodes of a build (dangling images).

It intentionally hides intermediate image layers (unless `-a` is provided) to keep the output clean. The `SIZE` reported represents the cumulative logical disk size of all read-only filesystem layers that comprise the image. However, because Docker storage drivers use Union Filesystems that heavily deduplicate identical layers, the sum of all image sizes listed in `docker images` will vastly exceed the actual physical disk space consumed on the host.

## Performance Notes

- Executing `docker images` is extremely fast as it merely queries the daemon's in-memory graph database, requiring no intensive disk `stat` operations or network calls.
- Because identical base image layers are shared across multiple tagged images (e.g., ten images based on `alpine`), deleting one image shown in the list may free up 0 bytes of disk space if other images still rely on those underlying layers.

## Security Notes

- **Cryptographic Verification:** Relying solely on the `TAG` column (e.g., `latest`) is insecure, as tags are mutable pointers that can be overwritten maliciously on a registry. Using `--digests` ensures you are inspecting the immutable, cryptographically hashed state of the image.

## Common Mistakes

- **Confusing dangling images with unused images:** Assuming `<none>:<none>` images are actively breaking the system. **Why it's wrong:** Dangling images are normal byproducts of building new images that overwrite existing tags. They consume space but are harmless.
- **Misinterpreting aggregate disk size:** Summing the `SIZE` column of all images and panicking that Docker is consuming 500GB. **Why it's wrong:** Layer sharing means a 1GB base layer shared by 10 images shows up as 1GB _each_ in the table, but only consumes 1GB total on the physical drive.
- **Using Image IDs to manage running containers:** Passing an Image ID into `docker stop`. **Why it's wrong:** Images are inert blueprints. Containers are live running instances (managed via `docker ps`).

## Best Practices

- Regularly execute `docker system prune` rather than writing complex `docker images | grep ...` bash scripts to safely purge dangling images, stopped containers, and unused build caches.
- Use `docker images --format` inside CI/CD pipelines to dynamically extract exactly the tags or IDs needed for downstream deployment steps, ensuring your automation is resilient to CLI formatting changes.

## Interview Questions

**Q:** What exactly is a "dangling" image in Docker, and why does it appear as `<none>:<none>` in the `docker images` output?
**A:** A dangling image is an image that is no longer referenced by any repository name or tag, nor is it serving as a parent layer for any tagged image. This typically occurs when you rebuild an image with the same tag (e.g., `my-app:latest`); the new build claims the `latest` tag, and the old image becomes untagged, dangling in the cache.
**Q:** If `docker images` lists five different application images that each report a size of 1GB, does that guarantee Docker is consuming 5GB of physical disk space?
**A:** No. Docker uses a Union Filesystem. If those five applications share the exact same 900MB base image layer (e.g., `ubuntu`), that 900MB layer is only stored on disk once. The total physical disk consumption will be far less than the aggregate mathematical sum of the individual image sizes.
**Q:** What is the security advantage of inspecting images using the `--digests` flag?
**A:** Image tags (like `latest` or `v1.0`) are mutable aliases that can be pointed to different image contents at any time. The `--digests` flag displays the immutable SHA-256 hash of the image manifest. Referencing this digest guarantees you are operating on a cryptographically verifiable, exact version of the image.

## Practice Problems

**Problem:** List all available tags for the `nginx` repository stored locally on your host machine.
**Hint:** Pass the specific repository name as a positional argument.
**Solution:** `docker images nginx` (This scopes the list query strictly to images matching the nginx repository).
**Problem:** Output only the raw Image IDs of every dangling (untagged) image on the system, which could be piped into a deletion command.
**Hint:** Combine the quiet flag with a filter explicitly targeting dangling status.
**Solution:** `docker images -q -f "dangling=true"` (The `-f` flag filters the daemon response, and `-q` strips away the table formatting to return raw IDs).

## References

- [Docker CLI Reference - docker images](https://docs.docker.com/engine/reference/commandline/images/)
- [Docker API Documentation - List Images](https://docs.docker.com/engine/api/v1.43/#tag/Image/operation/ImageList)
