---
slug: docker-rmi
name: docker rmi
aliases:
  - docker image rm
category: cloud-cli
tags:
  - docker
  - containers
  - images
  - cleanup
  - storage
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
  - delete docker image
  - remove local docker image
  - clean up image cache
  - untag docker image
  - force delete docker image
relatedCommands:
  - docker-rm
  - docker-pull
  - docker-build
  - docker-images
  - docker-system-prune
  - docker-tag
alternatives:
  - docker-system-prune
status: draft
---

## What is it?

`docker rmi` is a command-line utility used to remove one or more Docker images from the local Docker host's cache. It untags images and, if no other tags reference the underlying image layers and no stopped or running containers depend on them, it permanently deletes the physical read-only filesystem layers from the host's disk.

## Why does it exist?

Docker images are constructed using a layered union filesystem (like `overlay2`), where each instruction in a Dockerfile generates a discrete, immutable layer. Over time, pulling new versions of images or iterating through builds consumes vast amounts of local storage, filling `/var/lib/docker` with orphaned or obsolete layers. `docker rmi` exists to provide precise, granular garbage collection for these artifacts. It safely manages the reference counting of shared layers, ensuring that deleting a specific image tag only reclaims disk space if those layers are no longer required by any other active image or container on the system.

## Syntax

```bash
docker rmi [OPTIONS] IMAGE [IMAGE...]
docker image rm [OPTIONS] IMAGE [IMAGE...]
```

## Flags

| Flag            | Description                                                                                                                                        | Example                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `-f`, `--force` | Forcefully removes the image, overriding safety checks even if a stopped container references it, or if multiple tags point to the same image ID.  | `docker rmi -f ubuntu:latest`                  |
| `--no-prune`    | Prevents the deletion of untagged parent layers. Only the specified tag is removed, retaining the underlying layer cache for faster future builds. | `docker rmi --no-prune myapp:v1`               |
| `-q`, `--quiet` | Suppresses standard output, emitting only the IDs of the images that were successfully removed. Useful for automated cleanup pipelines.            | `docker rmi -q $(docker images -q)`            |
| `-H`, `--host`  | _(Global Docker Flag)_ Overrides the default daemon socket to send the removal request to a remote Docker daemon via TCP or SSH.                   | `docker -H tcp://10.0.1.5:2375 rmi app:latest` |
| `--context`     | _(Global Docker Flag)_ Uses a pre-configured connection context to target a specific remote Docker Engine for image deletion.                      | `docker --context prod rmi nginx:alpine`       |
| `--tlsverify`   | _(Global Docker Flag)_ Enforces strict TLS certificate verification when connecting to a remote Docker daemon over TCP.                            | `docker --tlsverify rmi node:18`               |
| `--tlscacert`   | _(Global Docker Flag)_ Path to the CA certificate used for remote TLS daemon connections.                                                          | `docker --tlscacert ca.pem rmi redis:alpine`   |
| `--tlscert`     | _(Global Docker Flag)_ Path to the client TLS certificate.                                                                                         | `docker --tlscert cert.pem rmi mysql:8`        |
| `--tlskey`      | _(Global Docker Flag)_ Path to the client TLS private key.                                                                                         | `docker --tlskey key.pem rmi postgres:14`      |
| `--help`        | Prints a brief help message displaying usage syntax and available flags for the command.                                                           | `docker rmi --help`                            |

## Examples

```bash
docker rmi nginx:latest
```

> The standard invocation. Assesses the `nginx:latest` tag. If it is not in use by any container, it untags the image and deletes the underlying filesystem layers, reclaiming disk space.

```bash
docker rmi -f fd484f19954f
```

> Forcefully deletes an image using its SHA256 ID. The `-f` flag is required here if multiple tags (e.g., `myapp:v1` and `myapp:latest`) both point to this exact same image ID.

```bash
docker rmi $(docker images -f "dangling=true" -q)
```

> An automated garbage collection pattern. `docker images` filters for "dangling" images (images with no tag, shown as `<none>:<none>` in the UI), returning their raw IDs. `docker rmi` then iterates through this list to purge intermediate build artifacts.

```bash
docker rmi [myregistry.com/app:v1](https://myregistry.com/app:v1) [myregistry.com/app:v2](https://myregistry.com/app:v2)
```

> Demonstrates batch deletion. The CLI accepts a space-separated list of image tags or IDs, issuing removal commands sequentially to efficiently clear out multiple old versions of an application.

```bash
docker rmi --no-prune python:3.9-slim
```

> Untags the `python:3.9-slim` image but explicitly preserves the intermediate filesystem layers on disk. This is highly useful if you are about to build a new image that shares the same base layers and want to maintain maximum cache hit performance.

## Real-World Scenarios

**CI/CD Pipeline Cache Cleanup**

```bash
docker build -t myapp:${BUILD_ID} .
docker push myapp:${BUILD_ID}
docker rmi myapp:${BUILD_ID}
```

> In ephemeral Jenkins or GitLab CI runners, disk space is severely limited. After successfully compiling, tagging, and pushing a massive multi-gigabyte application image to a remote container registry, the pipeline immediately issues `docker rmi` to scrub the local artifact, preventing the runner from hitting `No space left on device` errors on subsequent jobs.

**Resolving Tagging Conflicts**

```bash
docker rmi my-frontend:latest
docker tag my-frontend:v2.1 my-frontend:latest
```

> When manually promoting release tags, engineers often need to repurpose the `latest` tag. They execute `docker rmi` to explicitly remove the `latest` reference from the old image ID before applying it to the new image ID. Because multiple tags reference the same underlying layers, this action deletes no physical disk data; it only mutates metadata.

## When should it NOT be used?

- **Removing Running Containers:** **Do not use `docker rmi` to stop an application.** Images are read-only templates. Deleting an image has no effect on a container that is already actively running. You must use `docker stop` and `docker rm` to kill the instance.
- **Global Host Purges:** **Do not script complex `awk` pipelines to delete old images.** If your goal is to reclaim disk space across the entire host, `docker image prune -a` or `docker system prune` is significantly safer and handles dependency graphs flawlessly compared to iterative `rmi` calls.
- **Deleting Registry Images:** **Do not use `docker rmi` to delete an image from Docker Hub or AWS ECR.** `docker rmi` only operates on the _local_ daemon's cache. To delete an image from a remote registry, you must use that registry's specific API or CLI (e.g., `aws ecr batch-delete-image`).

## Alternatives

- **`docker image prune`:** **Best for automated hygiene.** Identifies and removes dangling images (and unreferenced images if `-a` is passed) interactively, avoiding the need to manually specify image IDs.
- **`docker system prune -a`:** **Best for complete resets.** Eradicates all unused images, networks, and stopped containers in a single, sweeping garbage collection cycle.
- **`docker rmi -f` vs `docker rm`:** Remember that `rm` is for containers (instances), while `rmi` is for images (templates).

## How it works internally

When you issue `docker rmi`, the Docker CLI sends an HTTP DELETE request to the Docker daemon's `/images/{name}` API endpoint.

The Docker daemon manages images using a reference-counted directed acyclic graph (DAG) of read-only overlay filesystem layers. First, the daemon locates the image metadata. If you specified a tag (e.g., `ubuntu:latest`), the daemon executes an "Untag" operation. It removes the human-readable string pointer from its internal SQLite metadata database.

Next, it checks the reference count of the underlying image ID (the SHA256 digest). If other tags still point to this ID, the deletion sequence terminates immediately. No disk space is freed.

If the reference count hits zero, the daemon proceeds. It iterates downward through the parent filesystem layers. For each layer, it checks if any instantiated container (even stopped ones) or other images depend on it. If a layer is completely orphaned, the daemon instructs the storage driver (e.g., `overlay2`) to perform `unlink()` syscalls, physically deleting the layer's directory from `/var/lib/docker/overlay2/` and freeing physical disk blocks.

## Performance Notes

- **I/O Bound Deletions:** Untagging an image is a nearly instantaneous metadata operation. However, if the image has zero other references and contains large gigabyte-sized layers, `docker rmi` triggers extensive filesystem `unlink` operations. This can induce significant disk I/O load, momentarily slowing down other container operations on the host.

## Security Notes

- **Malware Persistence in Containers:** If you pull a malicious image and spin up a container from it, running `docker rmi` will fail by default. If you bypass this with `docker rmi -f`, the daemon untags the image, but the read-only layers _remain permanently attached_ to the compromised container. To eradicate the malware, you must first `docker rm -f` the container, _then_ `docker rmi` the image.
- **Daemon Access:** Executing `docker rmi` requires access to the Docker socket. Modifying the local image cache can be used in denial-of-service attacks to delete critical base images, forcing the daemon to re-download them during high-traffic scaling events.

## Common Mistakes

- **Confusing `rmi` with `rm`**
  - _Mistake:_ Typing `docker rmi my_database` to stop and delete a running PostgreSQL instance.
  - _Why:_ The daemon will reject the command with an error stating the image is being used by a running container. `rmi` deletes the blueprint; `rm` deletes the house. You must `docker rm -f my_database` first.
- **Misunderstanding untagging vs deletion**
  - _Mistake:_ Tagging `app:v1` as `app:latest`, then running `docker rmi app:v1`, expecting disk space to be freed.
  - _Why:_ The layers are identical. `docker rmi` only removes the `app:v1` string alias. Because `app:latest` still references the exact same SHA256 digest, the daemon preserves all physical files.
- **Force deleting images with active containers**
  - _Mistake:_ Using `docker rmi -f myapp` while a container is running it.
  - _Why:_ This leaves the active container in a detached, "zombie" state regarding image metadata. The layers are preserved on disk, but identifying what image the container is actually running becomes nearly impossible in audit logs.

## Best Practices

- **Let Orchestrators Manage Cache:** In Kubernetes environments, do not run `docker rmi` manually on worker nodes. The Kubelet has a built-in garbage collection mechanism (`imageGCHighThresholdPercent`) that automatically evaluates disk pressure and purges unused images safely based on eviction policies.
- **Use Digest Pins for Critical Removals:** In strict security pipelines, if an image tag is compromised, delete it by its immutable SHA256 digest (e.g., `docker rmi nginx@sha256:abcd...`) rather than its tag, guaranteeing the exact binary payload is targeted for removal.

## Interview Questions

**Q: You attempt to run `docker rmi my_api:latest`. The daemon returns an error stating "image is being used by stopped container 8a9b2c". What is the architectural reason Docker prevents this deletion?**
**A:** Docker's `overlay2` storage driver stacks the container's writable layer directly on top of the image's read-only layers. Even if a container is stopped, its filesystem configuration relies entirely on those base layers existing on disk. If Docker permitted the deletion of the image, the stopped container's filesystem would instantly become corrupted and unbootable. You must delete the container first.

**Q: Explain the difference in execution behavior when running `docker rmi` on an image with multiple tags versus an image with a single tag.**
**A:** If an image has multiple tags (e.g., `v1` and `latest`), running `docker rmi app:v1` merely performs an "untag" operation. It deletes the metadata alias but leaves the underlying image ID and physical layers completely untouched on disk. If the image has only one tag, `docker rmi` removes the tag and then physically deletes the unreferenced read-only filesystem layers, reclaiming disk space.

## Practice Problems

**Problem:** You are cleaning up a build server. You need to delete an image named `ubuntu:18.04`, but a stopped container is currently relying on it. You do not care about the stopped container and want to force the deletion of the image anyway.
**Hint:** Use the flag that bypasses the dependency safety check.
**Solution:**

```bash
docker rmi -f ubuntu:18.04
```

**Problem:** You want to generate a list of all dangling images (images without tags) and pass their raw IDs directly to the remove command using bash substitution.
**Hint:** Combine `docker rmi` with a filtered `docker images` command using the quiet flag.
**Solution:**

```bash
docker rmi $(docker images -f "dangling=true" -q)
```

## References

- [Docker CLI Reference: docker rmi](https://docs.docker.com/engine/reference/commandline/rmi/)
- [About storage drivers](https://docs.docker.com/storage/storagedrivers/)
