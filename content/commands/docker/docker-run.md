---
slug: docker-run
name: docker-run
aliases: []
category: docker
tags:
  - docker-run
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - run a container
  - start docker container
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`docker run` creates and starts a container from a specified image.

## Why does it exist?

`docker run` encapsulates image pulling, container creation, filesystem isolation, network binding, and process execution into a single command.

## Syntax

```bash
docker run [options] image [command] [arg...]
```

## Flags

| Flag | Description                                 | Example                                |
| ---- | ------------------------------------------- | -------------------------------------- |
| `-d` | Run container in background (detached mode) | `docker run -d nginx`                  |
| `-p` | Publish a container port to the host        | `docker run -p 8080:80 nginx`          |
| `-v` | Bind mount a volume                         | `docker run -v /host:/container nginx` |

## Examples

```bash
docker run -d -p 80:80 nginx
```

> Starts Nginx in detached mode mapping host port 80 to container port 80.

## Real-World Scenarios

**Local Development Environment**: Spinning up temporary PostgreSQL or Redis instances for local testing.

## When should it NOT be used?

- **Multi-container application orchestration**: `docker compose` is better suited for managing multi-service stacks.

## Alternatives

- **`docker compose up`**: Orchestrates multi-container applications from a YAML definition.

## How it works internally

`docker run` sends an API request to dockerd/containerd, which sets up cgroups, namespaces, storage layers, and network interfaces before launching the target entrypoint process.

## Performance Notes

Container startup is near-instantaneous compared to virtual machines because it shares the host operating system kernel.

## Security Notes

Avoid running containers with `--privileged` unless strictly necessary for hardware access.

## Common Mistakes

- **Forgetting `-d`**: Running interactive or server containers without `-d` blocks the terminal.

## Best Practices

- Always specify non-latest explicit tags for production images.

## Interview Questions

**Q:** What is the difference between `docker run` and `docker start`?
**A:** `docker run` creates a new container instance from an image, whereas `docker start` resumes an existing, stopped container.

## Practice Problems

**Problem:** Run an Alpine container interactively with a bash/sh shell and auto-remove it on exit.
**Solution:** `docker run --rm -it alpine sh`

## References

- [Docker run reference](https://docs.docker.com/engine/reference/commandline/run/)
