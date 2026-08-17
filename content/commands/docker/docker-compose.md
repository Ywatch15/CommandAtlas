---
slug: docker-compose
name: docker compose
aliases:
  - docker-compose
category: docker
tags:
  - docker
  - orchestration
  - containers
  - yaml
  - devops
  - infrastructure-as-code
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
  - cmd
  - sh
intentPhrases:
  - run multi-container docker app
  - start docker compose stack
  - teardown compose environment
  - build docker compose images
  - view compose logs
relatedCommands: [docker-run, docker-network, docker-volume, docker-build]
alternatives: [docker-network, docker-run]
status: draft
---

## What is it?

`docker compose` is a client-side orchestration tool that allows developers to define and run multi-container Docker applications. It uses a declarative YAML file (typically `compose.yaml`) to codify the entire architectural state of an application—including the required containers, exposed ports, interconnected virtual networks, and persistent storage volumes. With a single command, it translates this YAML blueprint into the dozens of imperative Docker API calls necessary to spin up the entire isolated environment simultaneously.

## Why does it exist?

Running a complex application locally (e.g., a React frontend, a Node.js API, a PostgreSQL database, and a Redis cache) using raw `docker run` commands is excruciating. Developers had to memorize massive strings of network flags, volume bindings, and environment variable injections, executing them in the exact correct order. `docker compose` exists to solve this by providing "Infrastructure as Code" for local development. By checking the `compose.yaml` file into Git, any engineer on the team can clone the repository and execute one command to boot a perfectly replicated, networked, and interdependent architecture, drastically reducing onboarding friction and the "it works on my machine" syndrome.

## Syntax

```bash
docker compose [OPTIONS] COMMAND
```

_(Note: In modern Docker installations (v2+), `compose` is a native plugin invoked as `docker compose`, replacing the legacy standalone python binary `docker-compose`.)_

## Flags

| Flag / Subcommand  | Description                                                                                                                       | Example                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `up`               | Builds, creates, starts, and attaches to containers for a service. The primary boot command.                                      | `docker compose up`                     |
| `down`             | Tears down the environment, gracefully stopping containers and destroying them along with the created networks.                   | `docker compose down`                   |
| `build`            | Explicitly compiles or recompiles the Docker images defined by the `build:` blocks in the YAML file.                              | `docker compose build --no-cache`       |
| `logs`             | Fetches and multiplexes the log output from all containers in the stack into a single, color-coded terminal stream.               | `docker compose logs -f`                |
| `-f`, `--file`     | Specifies the path to one or more Compose YAML files, overriding the default lookup of `compose.yaml`.                            | `docker compose -f prod.yaml up -d`     |
| `-d`, `--detach`   | (Flag for `up`) Runs the entire stack in the background, returning terminal control to the user immediately.                      | `docker compose up -d`                  |
| `--build`          | (Flag for `up`) Forces Compose to rebuild the images before starting containers, ensuring fresh source code is applied.           | `docker compose up --build -d`          |
| `--remove-orphans` | (Flag for `up`) Cleans up any leftover containers that exist for this project but are no longer defined in the current YAML file. | `docker compose up -d --remove-orphans` |
| `-v`, `--volumes`  | (Flag for `down`) Destroys all named volumes defined in the YAML file alongside the containers. Causes catastrophic data loss.    | `docker compose down -v`                |
| `--profile`        | Activates a specific operational profile. Useful for turning heavy debugging tools or optional databases on/off conditionally.    | `docker compose --profile debug up`     |

## Examples

```bash
docker compose up -d
```

> The quintessential Compose command. It reads `compose.yaml`, creates the default bridge network, creates any required volumes, pulls missing images, and boots all interdependent containers in the background (`-d`). Control is instantly returned to the terminal.

```bash
docker compose down
```

> Gracefully tears the stack down. It sends `SIGTERM` to all containers in the project, waits for them to halt, and then deletes the containers and the custom virtual network. Critically, it leaves managed volumes completely intact to preserve database state for the next `up`.

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

> Demonstrates file merging. Compose reads the base file first, and then applies the override file on top of it. This is a common pattern for defining a base architecture, and using an override file to inject localized development environment variables or port mappings.

```bash
docker compose logs -f --tail 50 api_server
```

> Tailoring log extraction. Instead of dumping the logs of all 10 services in the stack, this command specifically multiplexes the real-time (`-f`), truncated (`--tail 50`) log stream exclusively for the service named `api_server` in the YAML definition.

```bash
docker compose up -d --build --remove-orphans
```

> The safest way to deploy an updated configuration. `--build` guarantees that any changed local `Dockerfile`s are recompiled, and `--remove-orphans` ensures that if a service was deleted from the YAML file since the last run, its lingering container is destroyed to prevent ghost processes.

## Real-World Scenarios

**Full-Stack Local Development**

```bash
git clone [https://github.com/org/microservice-stack.git](https://github.com/org/microservice-stack.git)
cd microservice-stack
docker compose --profile frontend up -d
```

> A backend engineer checks out a massive repository containing 20 microservices. The `compose.yaml` file defines a profile named `frontend`. By passing `--profile frontend`, Compose spins up the core database, the Redis cache, and the specific APIs required by the frontend, but ignores heavy machine-learning worker containers that aren't necessary for UI work, saving massive amounts of laptop RAM.

**Automated CI Integration Testing**

```bash
docker compose -f docker-compose.ci.yml up --build --abort-on-container-exit
```

> A CI/CD runner spins up the entire application stack alongside a dedicated "test runner" container. The `--abort-on-container-exit` flag instructs Compose to watch the containers. The moment the test runner container finishes executing its Cypress/Selenium tests and exits, Compose automatically tears down the entire stack and cascades the test runner's exit code (0 or 1) to the pipeline to determine success or failure.

## When should it NOT be used?

- **Production Deployments:** **Do not use Docker Compose in high-availability production.** Compose runs on a single node and offers zero self-healing, rolling updates, or horizontal multi-host scaling. If the host machine dies, the app dies. Production environments must use true orchestrators like Kubernetes or Docker Swarm.
- **Building massive CI artifacts:** While Compose can `build`, it is optimized for local convenience, not heavy CI caching. Use modern Buildx (`docker buildx bake`) natively to compile multi-architecture images and push them to registries.

## Alternatives

- **Kubernetes (Minikube / Kind):** **Best for production parity.** If the application is destined for Kubernetes, developers should test using local K8s emulators (with tools like Skaffold or Tilt) rather than Compose, avoiding "YAML drift" between dev and prod.
- **Podman Compose:** **Best for daemonless security.** A drop-in replacement that executes `compose.yaml` files using Podman, running the entire stack as a standard user without requiring a root daemon, enhancing security.

## How it works internally

`docker compose` is a client-side orchestration tool. Unlike Kubernetes, there is no master node or control plane monitoring your desired state.

When you execute `docker compose up`, the Go binary parses your `compose.yaml` file. It merges variable interpolations (from `.env` files) and constructs an internal Directed Acyclic Graph (DAG) by evaluating the `depends_on` blocks defined in the YAML.

If `api` depends on `db`, Compose knows it must initialize `db` first.
Compose then translates this graph into sequential REST API calls against the local Docker daemon's socket.

1.  It sends a request to create a custom bridge network (e.g., `project_default`).
2.  It sends requests to create missing volumes.
3.  It issues Image Pull or Build requests.
4.  It iteratively issues Container Create and Start requests, automatically injecting network aliases so the `api` container can dynamically resolve the internal IP of the `db` container via Docker's embedded DNS.

Compose manages the association of these resources by attaching specific metadata labels (e.g., `com.docker.compose.project=my_app`) to every container, network, and volume it provisions. When you run `docker compose down`, it simply queries the daemon for all resources bearing that specific label and issues API requests to destroy them.

## Performance Notes

- **Parallel Booting:** Modern Compose (v2) boots independent containers concurrently. If you have 5 web services that do not depend on each other, it starts them simultaneously, massively reducing the overall boot time of large developer environments compared to older v1 Python implementations.
- **Wait Conditions:** By default, `depends_on` only waits for a container to _start_. A database might start instantly but take 30 seconds to initialize schemas. To prevent the API container from crashing, use `depends_on: db: condition: service_healthy` combined with a `healthcheck:` block, forcing Compose to poll the database and block the API boot until the database is actively accepting connections.

## Security Notes

- **`.env` File Injection:** Compose automatically reads a `.env` file in the execution directory and parses it to perform variable substitution inside the `compose.yaml` (e.g., `image: myapp:${VERSION}`). Ensure `.env` files containing production secrets are strictly included in `.gitignore` and never committed to source control.
- **Bind Mount Dangers:** Mounting the root filesystem or sensitive directories (`-v /:/host:ro`) via Compose for convenience grants the containers (which often run as root) terrifying access to the host machine. Ensure bind mounts are strictly localized to the development workspace.

## Common Mistakes

- **Wiping the Database via `down -v`**
  - _Mistake:_ Wanting to reboot the environment cleanly and running `docker compose down -v`, then realizing all local user accounts and seeded test data are gone.
  - _Why:_ The `-v` flag explicitly cascades the teardown to include all managed storage volumes. Standard `docker compose down` destroys the containers but preserves the volumes safely. Never use `-v` unless you explicitly want to annihilate your database state.
- **Modifying YAML while the stack is running**
  - _Mistake:_ Changing a port mapping in `compose.yaml` from `8080` to `9090`, then running `docker compose start` and wondering why it doesn't work.
  - _Why:_ The `start` command only boots existing containers; it does not read the YAML file. To apply changes made to the configuration file, you must run `docker compose up -d`. Compose will detect the diff, recreate the specific container with the new ports, and leave the unchanged containers alone.

## Best Practices

- **Leverage Profiles:** Don't force every developer to boot a 15-container stack if they only work on the frontend. Use `profiles: ["backend"]` in your YAML. This allows modular booting (`docker compose --profile frontend up`) while keeping all infrastructure documented in a single source of truth.
- **Name your projects explicitly:** By default, Compose uses the name of the current directory as the project name (e.g., `folder_default` network). If you clone the repo to a folder named `test`, it breaks cross-project references. explicitly define `name: my_project` at the top of your `compose.yaml`.

## Interview Questions

**Q: You make a change to the source code of a Node.js application, which is configured to be built via a `build:` block in `compose.yaml`. You run `docker compose up -d`. The container starts, but your code changes are missing. Why?**
**A:** By default, `docker compose up` only builds an image if the image does not currently exist on the host. Because you already built it previously, Compose simply uses the stale cached image. To force Compose to parse the Dockerfile and apply the new source code, you must append the `--build` flag (`docker compose up --build -d`).

**Q: Explain how the `api` container knows how to connect to the `database` container in a default `docker compose` stack without you ever hardcoding IP addresses.**
**A:** When `docker compose up` executes, it creates a dedicated, custom user-defined bridge network for the project. It attaches all containers to this network. Docker's embedded DNS server automatically maps the service names defined in the YAML file (e.g., `database`) to their dynamic internal IP addresses. Therefore, the `api` container simply uses the connection string `postgres://user:pass@database:5432`, and the Docker daemon handles the DNS resolution seamlessly.

## Practice Problems

**Problem:** You have cloned a repository containing a `compose.yaml` file. You want to boot the entire stack in the background so you can continue using your terminal, but you also want to guarantee that Compose forces a fresh rebuild of all Dockerfiles.
**Hint:** Combine the detached execution flag with the compilation flag.
**Solution:**

```bash
docker compose up -d --build
```

**Problem:** You are finished working for the day. You want to tear down the Compose stack running in the current directory. However, you absolutely want to ensure that your database volume (which took hours to seed with data) is preserved for tomorrow. Write the safest command to do this.
**Hint:** Use the standard teardown command without appending destructive modifiers.
**Solution:**

```bash
docker compose down
```

## References

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3/)
