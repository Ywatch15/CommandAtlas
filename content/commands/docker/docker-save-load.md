---
slug: docker-save-load
name: docker save
aliases:
  - docker image save
category: docker
tags:
  - docker
  - images
  - export
  - archive
  - offline
  - tar
difficulty: intermediate
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
  - export docker image to tar file
  - save docker image for offline transfer
  - backup docker image locally
  - convert docker image to archive
  - package docker image for airgapped system
relatedCommands:
  - docker-load
  - docker-images
  - docker-push
alternatives: []
status: draft
---

## What is it?

`docker save` is a command-line utility used to package one or more fully compiled Docker images from the local daemon cache into an uncompressed flat `tar` archive file. This archive bundles all the underlying filesystem layers, manifest files, and configuration metadata required to perfectly recreate the image on another machine.

## Why does it exist?

Typically, Docker images are distributed over networks via cloud registries (like Docker Hub using `docker push` and `pull`). However, highly secure enterprise environments, government networks, and edge devices often operate entirely air-gapped without internet access. `docker save` exists to bridge this gap, allowing administrators to serialize complex container images into physical files that can be scanned by security appliances, burned to physical media (like USB drives), and physically carried into disconnected network zones.

## Syntax

```bash
docker save [OPTIONS] IMAGE [IMAGE...]
```

## Flags

| Flag                      | Description                                                                                              | Example                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `-o`, `--output <string>` | Writes the exported archive to a specific file path instead of streaming it to standard output (STDOUT). | `docker save -o ubuntu_latest.tar ubuntu:latest` |
| `--help`                  | Outputs brief usage documentation and supported command-line options.                                    | `docker save --help`                             |

## Examples

```bash
docker save -o nginx-backup.tar nginx:alpine
```

> This queries the local cache for the `nginx:alpine` image, packages its layers and configuration into a single tar archive, and saves it to the local disk as `nginx-backup.tar`.

```bash
docker save busybox > busybox.tar
```

> By omitting the `-o` flag, this command streams the raw binary tar archive directly to standard output, utilizing shell redirection (`>`) to write the data to a file.

```bash
docker save my-app:v1 my-db:v1 -o bundled-app.tar
```

> This packages multiple distinct images (`my-app:v1` and `my-db:v1`) simultaneously into a single, unified tar archive, deduplicating any shared underlying base layers between them to save space.

```bash
docker save ubuntu:latest | gzip > ubuntu_latest.tar.gz
```

> Because `docker save` produces an uncompressed tarball, this pipes the standard output stream directly into the `gzip` utility, significantly compressing the archive footprint before writing it to disk.

## Real-World Scenarios

**Deploying into Air-Gapped Environments**

```bash
docker save -o compliance-scanner.tar sec-scanner:v3
```

> Security engineers package internal vulnerability scanning containers into tar archives, transferring them physically via secure USB media into disconnected SCADA or classified military networks for offline deployment via `docker load`.

**Bypassing Registry Network Bottlenecks in CI/CD**

```bash
docker save cache-image:latest | lz4 > cache.tar.lz4
```

> Complex CI/CD pipelines compile a massive base image in step one. Instead of pushing to a slow remote registry, they save and compress the image, pass it as a raw artifact file to parallel runner nodes, and load it instantly to accelerate build speeds.

**Archiving Legacy Software Versions**

```bash
docker save -o legacy-app-v1.tar old-monolith:v1.0
```

> Before migrating to a new registry platform or purging older local storage, operations teams serialize legacy monolithic images to archival storage (like AWS S3 Glacier) to ensure they can be recovered identically a decade later.

## When should it NOT be used?

- **Standard image distribution over internet-connected networks:** **Reason:** Saving tarballs and SCP/FTPing them across networks is incredibly inefficient because it transfers the entire image payload every time, ignoring Docker's native layer deduplication. **Use instead:** `docker push` and `docker pull` with a private registry.
- **Extracting just the files inside a container:** **Reason:** `docker save` exports the entire multi-layered image history and metadata; it is not meant for extracting flat application files. **Use instead:** `docker cp` or `docker export`.

## Alternatives

- **`docker push` / `docker pull`:** Native registry distribution. **Tradeoff:** Requires active network connectivity and authentication, but leverages extreme bandwidth efficiency via SHA-256 layer deduplication.
- **`docker export`:** Container filesystem extraction. **Tradeoff:** `export` flattens a _running or stopped container_ into a single raw filesystem tarball, stripping all image history, layers, and configuration metadata (like ENTRYPOINT). `save` operates on _images_ and preserves everything.

## How it works internally

When you execute `docker save`, the Docker CLI sends an HTTP `GET /images/{name}/get` request to the local Docker daemon.

The daemon queries its graph database to locate the Image Manifest for the requested tag. It then iterates through the exact ordered list of read-only filesystem layers (stored via OverlayFS or similar drivers) that comprise the image.

The daemon packages each distinct filesystem layer into its own nested tarball. It then generates a `manifest.json` file mapping the layers to the image tags, and configuration JSON files detailing the execution environment (ENV vars, CMD, entrypoints). Finally, it bundles all these nested tarballs and JSON metadata files together into one parent uncompressed `.tar` stream, delivering it to the CLI (which writes it to disk via `-o` or outputs to STDOUT).

Because it operates at the layer level, saving multiple images that share a base image (e.g., both use `alpine`) ensures the base layers are only included in the tarball once, preventing bloat.

## Performance Notes

- `docker save` produces completely uncompressed tar archives. An image that pulls at 300MB from Docker Hub (which uses gzip transmission) may easily expand to a 1GB+ tarball on disk. Always pipe the output through `gzip`, `pigz`, or `lz4` for storage efficiency.
- Packaging massive images incurs heavy sequential disk read/write I/O as the daemon restructures the overlay layers into a flat archive format.

## Security Notes

- **Complete History Preservation:** `docker save` preserves the entire immutable history of the image. If a developer accidentally baked an AWS key into a lower layer, then deleted it in an upper layer, `docker save` includes that deleted layer. Anyone loading the tarball can extract the compromised credential using `docker history`.
- **No Cryptographic Integrity:** Standard `.tar` files have no built-in signature verification. When transferring archives via USB or untrusted networks, always generate and verify separate SHA-256 checksums to ensure the archive was not tampered with before loading.

## Common Mistakes

- **Confusing `save` with `export`:** Trying to `docker save` a running container ID. **Why it's wrong:** `docker save` only targets static Images. To flatten a running container's filesystem, you must use `docker export`.
- **Saving to a terminal without redirection:** Running `docker save my-app`. **Why it's wrong:** This dumps gigabytes of raw binary tar data directly to your terminal screen, locking it up and rendering the output useless. Always use `-o` or shell redirection (`>`).
- **Forgetting compression:** Transferring a 5GB uncompressed `.tar` over a slow VPN connection. **Why it's wrong:** Failing to pipe the output through `gzip` wastes massive amounts of transfer time and storage.

## Best Practices

- Always use a multi-threaded compression utility (like `pigz` or `zstd`) when saving massive images in CI pipelines to drastically accelerate the packaging and archival process.
- When provisioning air-gapped systems, save multiple related images in a single command (`docker save imgA imgB -o bundle.tar`) to force layer deduplication, minimizing the size of the physical media required for transfer.

## Interview Questions

- _Query:_ What is the functional difference between `docker save` and `docker export`?
  - _A:_ `docker save` targets Docker **Images**. It creates a tar archive containing all the distinct read-only filesystem layers, image history, and execution metadata (like ENTRYPOINT and ENV). `docker export` targets running or stopped **Containers**. It flattens the container's current filesystem into a single layer, stripping away all historical layers and Docker image configuration metadata.
- _Query:_ Why does a Docker image saved via `docker save` often take up significantly more disk space than the network bandwidth it took to `docker pull` it?
  - _A:_ When Docker pulls images from a registry, the filesystem layers are transmitted in a compressed format (usually gzip). `docker save`, by default, serializes the image layers into a completely uncompressed raw `.tar` archive, resulting in a much larger file footprint on disk.
- _Query:_ If you run `docker save imageA imageB -o bundle.tar`, and both images are based on the exact same `ubuntu:latest` base layer, is the Ubuntu base layer copied into the tarball twice?
  - _A:_ No. `docker save` detects the shared layer hashes and optimizes the archive. The common base layer is only written into the bundled tar archive once, minimizing the file size.

## Practice Problems

- _Problem:_ Export the locally cached `alpine:latest` image to a tarball file named `alpine-backup.tar`.
  - _Hint:_ Use the explicit output flag combined with the image name.
  - _Solution:_ `docker save -o alpine-backup.tar alpine:latest` (This packages the image layers into the specified output file).
- _Problem:_ Save the `python:3.9` image, but pipe the output directly into `gzip` to compress it, saving the result as `python.tar.gz`.
  - _Hint:_ Omit the output flag, rely on STDOUT, pipe to the compression utility, and redirect to a file.
  - _Solution:_ `docker save python:3.9 | gzip > python.tar.gz` (This streams the raw tar payload through the gzip compressor before writing to the local disk).

## References

- [Docker CLI Reference - docker save](https://docs.docker.com/engine/reference/commandline/save/)
- [Docker Documentation - Back up, restore, or migrate data](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)
