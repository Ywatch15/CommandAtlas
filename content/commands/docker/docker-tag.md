---
slug: docker-tag
name: docker tag
aliases:
  - docker image tag
category: docker
tags:
  - docker
  - images
  - versioning
  - registries
  - tagging
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
  - rename docker image
  - add tag to docker image
  - prepare image for pushing
  - change repository name docker
  - version a docker container image
relatedCommands:
  - docker-build
  - docker-push
  - docker-images
  - docker-rmi
alternatives: []
status: draft
---

## What is it?

`docker tag` is a command-line utility used to create a new reference (an alias) pointing to an existing Docker image stored in the local cache. It assigns a target repository name and version tag to a source image ID, preparing the image for upload to a specific remote container registry.

## Why does it exist?

Images compiled via `docker build` often lack the fully qualified domain names required by remote registries. For example, building an image named `myapp:latest` is fine for local testing, but pushing it to AWS ECR requires the image to be named `123456.dkr.ecr.us-east-1.amazonaws.com/myapp:latest`. `docker tag` exists to bridge this gap, allowing developers to create lightweight, logically named pointers to identical physical image data without duplicating massive filesystem layers on the host disk.

## Syntax

```bash
docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]
```

## Flags

| Flag           | Description                                                                         | Example                                |
| -------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| `SOURCE_IMAGE` | (Argument) The local image name or 64-character hexadecimal Image ID to tag.        | `docker tag 4f3a2b1c0d my-repo:v1`     |
| `TARGET_IMAGE` | (Argument) The destination repository name, optionally including a registry prefix. | `docker tag app:v1 gcr.io/proj/app:v1` |
| `--help`       | Outputs brief usage documentation and supported command-line options.               | `docker tag --help`                    |

## Examples

```bash
docker tag 9f3e4b2d1a web-server:v1.0
```

> This assigns the repository name `web-server` and the tag `v1.0` directly to an existing, raw Image ID. If the image was previously untagged (dangling), it now appears cleanly in `docker images`.

```bash
docker tag frontend-app:latest frontend-app:stable
```

> This creates a second tag (`stable`) pointing to the exact same image data as the `latest` tag. Both tags will appear in `docker images` sharing identical Image IDs and disk sizes.

```bash
docker tag my-database:v2.4 [registry.gitlab.com/org/team/my-database:v2.4](https://registry.gitlab.com/org/team/my-database:v2.4)
```

> This prepends a fully qualified registry domain and namespace (`registry.gitlab.com/org/team/`) to the image name. This specific naming structure is mandatory before executing a `docker push` to that remote repository.

```bash
docker tag api-service:1.0.5 api-service:latest
```

> This aliases a highly specific semantic version image (`1.0.5`) as the generic `latest` tag, updating the local repository pointer so new `docker run` commands default to the updated version.

## Real-World Scenarios

**Preparing Automated Build Artifacts for Distribution**

```bash
docker tag app-build:latest [845123.dkr.ecr.us-west-2.amazonaws.com/finance-app:$CI_COMMIT_SHA](https://845123.dkr.ecr.us-west-2.amazonaws.com/finance-app:$CI_COMMIT_SHA)
docker push [845123.dkr.ecr.us-west-2.amazonaws.com/finance-app:$CI_COMMIT_SHA](https://845123.dkr.ecr.us-west-2.amazonaws.com/finance-app:$CI_COMMIT_SHA)
```

> CI/CD pipelines build code into a generic local tag (`app-build:latest`). Before pushing, the pipeline uses `docker tag` to dynamically inject the remote AWS registry URL and the exact Git commit SHA, ensuring an immutable, traceable artifact is uploaded to the cloud.

**Promoting Images Across Environments**

```bash
docker pull [registry.corp.com/app:staging](https://registry.corp.com/app:staging)
docker tag [registry.corp.com/app:staging](https://registry.corp.com/app:staging) [registry.corp.com/app:production](https://registry.corp.com/app:production)
docker push [registry.corp.com/app:production](https://registry.corp.com/app:production)
```

> Release managers promote tested applications by pulling the `staging` artifact, re-tagging the exact same, immutable image ID as `production`, and pushing it back. This guarantees the byte-for-byte exact code tested in staging is what runs in production.

## When should it NOT be used?

- **Altering the actual filesystem contents of an image:** **Reason:** Tagging merely creates a text pointer; it cannot alter code, variables, or layers inside the container. **Use instead:** `docker build` with an updated Dockerfile, or `docker commit`.
- **Replacing strict cryptographic digests:** **Reason:** Tags are mutable aliases. If strict immutability and provenance verification are required, deploying by `@sha256:digest` is vastly superior to tracking via text tags.

## Alternatives

- **`docker build -t`:** Tagging during compilation. **Tradeoff:** Using the `-t` flag during `docker build` compiles the image and tags it simultaneously, preventing the need to run an explicit `docker tag` command manually afterward.

## How it works internally

When you execute `docker tag`, the Docker CLI sends an HTTP `POST /images/{name}/tag` request to the local Docker daemon.

The daemon does absolutely no disk copying, layer duplication, or heavy I/O operations. It simply looks up the source Image ID in its internal graph database. It then inserts a new metadata record linking your provided `TARGET_IMAGE[:TAG]` string to that existing 64-character SHA-256 Image ID.

When you run `docker images`, both the old and new tags will be displayed on separate rows. However, because they share the same Image ID, they point to the exact same physical OverlayFS layers on the host disk. Deleting one tag (via `docker rmi`) merely removes the text pointer; the underlying image layers are only physically deleted when the final tag pointing to them is removed.

## Performance Notes

- `docker tag` executes instantaneously (microseconds) as it only involves writing a lightweight metadata record to the daemon's local SQLite/graph database, regardless of whether the image is 5MB or 50GB.

## Security Notes

- **Tag Mutability Risks:** Docker tags are entirely mutable. If you tag an image `app:v1` today, you can retag a completely different (and potentially malicious) image as `app:v1` tomorrow. For secure, immutable references, rely on cryptographic SHA digests rather than human-readable tags.
- **Namespace Collisions:** Accidentally tagging an internal proprietary image with an external public namespace (e.g., `docker tag secret-app nginx:latest`) and later executing `docker push nginx` could leak corporate code if you somehow have push access, or overwrite local cache states unexpectedly.

## Common Mistakes

- **Assuming tagging duplicates data:** Believing that tagging a 1GB image creates a copy and consumes 2GB of disk space. **Why it's wrong:** Tags are just references (like hard links). Ten tags pointing to a 1GB image consume a total of 1GB.
- **Forgetting to push the new tag:** Tagging an image for a remote registry and assuming the registry is updated automatically. **Why it's wrong:** `docker tag` operates strictly locally. You must explicitly run `docker push <new-tag>` to sync the alias to the cloud.
- **Omitting the colon for the target tag:** Running `docker tag image app v1`. **Why it's wrong:** The syntax strictly requires a colon (`:`) between the repository name and the version tag (e.g., `app:v1`). Spaces create parser errors.

## Best Practices

- Implement "Dual Tagging" in CI/CD pipelines: tag every new build with an immutable identifier (like the Git commit SHA) _and_ a rolling environment tag (like `staging` or `latest`), pushing both to the registry.
- Enforce Semantic Versioning (SemVer) when tagging releases (e.g., `v1.4.2`) to clearly communicate breaking changes and feature additions to downstream consumers.
- Clean up old local tags using `docker rmi` when they are no longer needed to prevent your `docker images` output from becoming an unreadable wall of text.

## Interview Questions

- _Query:_ Does creating a new tag for an existing 5GB Docker image consume an additional 5GB of storage on your host machine? Why or why not?
  - _A:_ No. `docker tag` simply creates a lightweight metadata alias (a pointer) in the Docker daemon's database that references the exact same underlying Image ID. It consumes no additional disk space for filesystem layers.
- _Query:_ Why is it necessary to run `docker tag` before pushing a locally built image to an AWS Elastic Container Registry (ECR)?
  - _A:_ The `docker push` command uses the image's repository name to determine the network routing destination. A locally built image named `my-app` defaults to targeting Docker Hub. You must use `docker tag` to prepend the target ECR domain (e.g., `12345.dkr.ecr.aws.com/my-app`) so the push command routes the payload to the correct remote server.
- _Query:_ If you have an image tagged as `api:v1` and `api:latest` sharing the same Image ID, what happens if you run `docker rmi api:latest`?
  - _A:_ The Docker daemon will "untag" the `api:latest` reference, removing that specific alias from its database. However, the physical image layers remain untouched on disk because the `api:v1` tag still references that exact same Image ID.

## Practice Problems

- _Problem:_ You have an existing image locally tagged as `backend-api:dev`. Create a new alias for this exact image configured to push to a Google Container Registry at `gcr.io/my-project/backend-api:v1.2.0`.
  - _Hint:_ Use the source image followed by the fully qualified target image URL and tag.
  - _Solution:_ `docker tag backend-api:dev gcr.io/my-project/backend-api:v1.2.0` (This creates the required naming structure for authentication and pushing to GCP).
- _Problem:_ Assign the generic tag `stable` to a specific image ID `5a3b9d1e`. The repository name should be `payment-service`.
  - _Hint:_ Pass the raw hexadecimal ID as the source argument.
  - _Solution:_ `docker tag 5a3b9d1e payment-service:stable` (This links the human-readable repository and tag to the underlying anonymous Image ID).

## References

- [Docker CLI Reference - docker tag](https://docs.docker.com/engine/reference/commandline/tag/)
- [Docker Documentation - Working with registries](https://docs.docker.com/registry/introduction/)
