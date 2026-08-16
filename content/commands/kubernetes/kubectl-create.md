---
slug: kubectl-create
name: kubectl create
aliases: []
category: kubernetes
tags:
  - kubernetes
  - kubectl
  - deployment
  - resources
  - imperative
  - k8s
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
  - create kubernetes resource from file
  - generate kubernetes configmap
  - create kubernetes secret cli
  - imperatively create k8s object
  - instantiate kubernetes namespace
relatedCommands:
  - kubectl-apply
  - kubectl-delete
alternatives:
  - kubectl-apply
status: draft
---
## What is it?

`kubectl create` is an imperative command-line utility used to instantiate a brand new Kubernetes resource. It can generate objects either by reading a structured manifest file (YAML/JSON) or by executing specific subcommands (like `create secret` or `create configmap`) that dynamically construct and submit resources directly via CLI arguments.

## Why does it exist?

While `kubectl apply` (declarative IaC) is the industry standard for maintaining persistent infrastructure, writing flawless YAML by hand is tedious. Administrators and developers require a rapid, programmatic mechanism to bootstrap environments, generate complex cryptographic secrets, or spin up isolated namespaces without manually authoring YAML files. `kubectl create` exists to provide these immediate, imperative generation capabilities, offering built-in generators that translate simple command-line arguments into valid Kubernetes API payloads.

## Syntax

```bash
kubectl create (-f FILENAME | TYPE [NAME] [options])
```

## Flags

| Flag                       | Description                                                                                                | Example                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `-f`, `--filename <path>`  | The path to a file, directory, or remote URL containing the resource definitions to create.                | `kubectl create -f pod.yaml`                                            |
| `--dry-run=<strategy>`     | Simulates creation (`client` or `server`). Ideal for generating YAML templates without deploying.          | `kubectl create deployment web --image=nginx --dry-run=client`          |
| `-o`, `--output <format>`  | Outputs the generated resource in a specific format (`yaml` or `json`).                                    | `kubectl create namespace test -o yaml`                                 |
| `--save-config`            | Injects the `last-applied-configuration` annotation, allowing future updates via `kubectl apply`.          | `kubectl create -f app.yaml --save-config`                              |
| `-n`, `--namespace <ns>`   | Forces the creation of the resource into a specific target namespace.                                      | `kubectl create secret generic db-pass --from-literal=pass=123 -n prod` |
| `--edit`                   | Opens the generated resource in your default text editor for modification before submitting it to the API. | `kubectl create service clusterip my-svc --tcp=80:8080 --edit`          |
| `--from-literal=<key=val>` | (Subcommand specific) Injects a raw string key-value pair directly into a ConfigMap or Secret.             | `kubectl create configmap config --from-literal=env=dev`                |
| `--from-file=<path>`       | (Subcommand specific) Reads a file from disk and inserts its contents into a ConfigMap or Secret.          | `kubectl create secret generic cert --from-file=tls.crt`                |

## Examples

```bash
kubectl create namespace staging-env
```

> This uses the imperative generator subcommand to instantly provision a new logical isolation boundary (namespace) named `staging-env` without requiring a predefined YAML file.

```bash
kubectl create secret generic api-keys --from-literal=token=SuperSecret123
```

> This dynamically constructs an Opaque Kubernetes Secret named `api-keys`. It takes the literal string provided, encodes it securely into base64 format automatically, and submits the payload to the API server.

```bash
kubectl create configmap app-config --from-file=./settings.json
```

> This reads the contents of the local `settings.json` file, embeds the entire file payload into the `data` block of a new Kubernetes ConfigMap, and saves it to the cluster, enabling pods to mount the file as a volume.

```bash
kubectl create -f [https://k8s.io/examples/application/deployment.yaml](https://k8s.io/examples/application/deployment.yaml)
```

> This fetches a raw, unauthenticated YAML manifest directly from a remote web URL and creates the resources defined within it on the active cluster.

```bash
kubectl create deployment my-app --image=nginx:1.24 --dry-run=client -o yaml > deployment.yaml
```

> This is a crucial "YAML generator" pattern. It uses the CLI to construct a Deployment resource, intercepts the API request before it leaves the client (`--dry-run=client`), formats it as raw YAML (`-o yaml`), and redirects the output to a local file. This eliminates the need to write boilerplate YAML from scratch.

## Real-World Scenarios

**Rapid Secret Bootstrapping in CI/CD**

```bash
kubectl create secret docker-registry gitlab-pull-token \
  --docker-server=registry.gitlab.com \
  --docker-username=$CI_USER \
  --docker-password=$CI_TOKEN -n application
```

> Deployment pipelines securely inject ephemeral authentication tokens by leveraging `kubectl create secret docker-registry`, natively handling complex `.dockerconfigjson` structural formatting without writing files to disk.

**Generating Infrastructure-as-Code Boilerplate**

```bash
kubectl create job backup-job --image=postgres:14 --dry-run=client -o yaml > backup-cron.yaml
```

> Platform engineers tasked with authoring new Kubernetes resources utilize the imperative generators to produce syntactically flawless base YAML files instantly, which they then commit to Git repositories for subsequent declarative `kubectl apply` workflows.

## When should it NOT be used?

- **Applying updates to existing infrastructure:** **Reason:** `kubectl create` is strictly designed for instantiation. If the resource already exists in the cluster, the command violently rejects the request and throws an "AlreadyExists" error. **Use instead:** `kubectl apply`.
- **Executing persistent GitOps pipelines:** **Reason:** Imperative CLI commands are inherently anti-declarative, burying infrastructure configuration inside Bash scripts rather than version-controlled YAML files. **Use instead:** Maintain YAML manifests applied via ArgoCD or `kubectl apply`.

## Alternatives

- **`kubectl apply`:** The declarative standard. **Tradeoff:** `apply` handles both creation and updates dynamically via merge patches, whereas `create` is a rigid, one-shot operation that fails upon collision.
- **`helm create`:** Package scaffolding. **Tradeoff:** Generates an entire directory structure for templated multi-resource applications, whereas `kubectl create` generates single standalone Kubernetes objects.

## How it works internally

When using `kubectl create -f <file>`, the client parses the YAML, validates the schema structure locally, and translates it into an HTTP `POST` request targeted at the corresponding REST API endpoint (e.g., `POST /api/v1/namespaces/default/pods`). The API server attempts to insert the new object into the `etcd` database. If an object with the same name, kind, and namespace already exists, `etcd` rejects the insertion, and the API server returns an HTTP 409 Conflict (AlreadyExists) error.

When using imperative subcommands (like `kubectl create secret`), the CLI does not read from a file. Instead, it utilizes built-in Go generator functions. These functions take the command-line flags (like `--from-literal`), encode the data (such as automatically base64-encoding secrets), assemble a complete JSON payload in memory that adheres to the Kubernetes API schema, and then issue the same HTTP `POST` request.

Crucially, unlike `kubectl apply`, `kubectl create` does _not_ embed the `kubectl.kubernetes.io/last-applied-configuration` annotation in the object metadata by default, rendering future dynamic merge patching nearly impossible unless explicitly requested via `--save-config`.

## Performance Notes

- Creating massive quantities of small resources via individual imperative CLI commands (e.g., a `for` loop executing `kubectl create configmap`) incurs severe network latency and API server overhead. Batching resources into a single YAML list and running `kubectl create -f bulk.yaml` processes the operation significantly faster.

## Security Notes

- **Plaintext Terminal Logging:** Creating secrets via `kubectl create secret generic my-secret --from-literal=pass=P@ssw0rd` leaves the plaintext password permanently recorded in the user's `~/.bash_history` file. Use `--from-file` or environment variable piping to avoid terminal leakage.
- **RBAC Boundaries:** Executing `kubectl create` requires explicit `create` permissions bound to a Role or ClusterRole for the specific API group being manipulated.

## Common Mistakes

- **Attempting to update resources with create:** Running `kubectl create -f config.yaml` after editing the file. **Why it's wrong:** The API server throws an `AlreadyExists` error because `POST` operations cannot mutate existing state. You must use `apply` or `replace`.
- **Base64 encoding secrets manually via CLI:** Running `echo "pass" | base64` and passing that into `--from-literal`. **Why it's wrong:** The `kubectl create secret` generator automatically applies base64 encoding to whatever string you pass. If you pass an already-encoded string, it will be double-encoded, causing application authentication failures.
- **Forgetting `--save-config` on manual scaffolding:** **Why it's wrong:** If you manually scaffold a Deployment using `create`, and a week later try to manage it declaratively with `kubectl apply`, `apply` will throw a warning about a missing annotation and struggle to calculate merge patches.

## Best Practices

- Exploit the `--dry-run=client -o yaml` pattern universally. It is the absolute fastest, most accurate way to scaffold complex Kubernetes YAML files without consulting documentation or risking YAML indentation errors.
- When executing imperative setups that you intend to manage declaratively later, always append the `--save-config` flag so the object is primed for future `kubectl apply` operations.
- When provisioning secrets via scripts, use `--from-file=/dev/stdin` combined with pipeline redirection to ensure secure strings are never logged to terminal history buffers.

## Interview Questions

- **Q:** What is the specific error that occurs if you run `kubectl create -f app.yaml` on a cluster where that application has already been deployed? How does this differ from `kubectl apply`?
  - **A:** The API server will return an `AlreadyExists` (HTTP 409 Conflict) error, and the command will fail completely. This is because `create` utilizes a strict `POST` request intended only for instantiation. `kubectl apply` utilizes a `PATCH` request; if the resource exists, it intelligently calculates the differences and updates the live object dynamically without failing.
- **Q:** Explain the powerful architectural workflow known as the "YAML generator pattern" using `kubectl create`.
  - **A:** Writing flawless Kubernetes YAML by hand is tedious. The YAML generator pattern utilizes imperative subcommands combined with client-side interception. By executing a command like `kubectl create deployment web --image=nginx --dry-run=client -o yaml > web.yaml`, the CLI constructs the perfect resource structure in memory and dumps it to a file without ever contacting the cluster, providing instant, error-free boilerplate code for GitOps repositories.
- **Q:** Why is it functionally incorrect to manually Base64 encode a password string before providing it to the `kubectl create secret generic --from-literal` command?
  - **A:** The Kubernetes API requires secrets to be stored in Base64 format. However, the `kubectl create secret` imperative CLI generator is programmed to execute this encoding automatically on behalf of the user. If a user inputs a string that is already Base64 encoded, the CLI will encode it a second time (double-encoding), resulting in the pod mounting a corrupted, invalid credential.

## Practice Problems

- _Problem:_ Generate a syntactically perfect YAML file named `backend-svc.yaml` for a ClusterIP service named `backend` exposing TCP port 8080, but ensure the service is NOT actually created on the cluster.
  - _Hint:_ Utilize the imperative service generator alongside the client dry-run interception strategy.
  - _Solution:_ `kubectl create service clusterip backend --tcp=8080:8080 --dry-run=client -o yaml > backend-svc.yaml` (This leverages the CLI to write boilerplate YAML instantly).
- _Problem:_ Create a new ConfigMap named `app-settings` in the `production` namespace containing a single literal key-value pair `environment=production`, and ensure it generates the annotation necessary for future `kubectl apply` updates.
  - _Hint:_ Combine the literal generator flag, namespace restriction, and the configuration preservation flag.
  - _Solution:_ `kubectl create configmap app-settings --from-literal=environment=production -n production --save-config` (This instantiates the resource while future-proofing it for declarative synchronization).

## References

- [Kubernetes Documentation - Managing Resources Imperatively](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/imperative-command/)
- [Kubectl Reference - create](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#create)
  