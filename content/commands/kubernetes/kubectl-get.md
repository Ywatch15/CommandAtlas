---
slug: kubectl-get
name: kubectl-get
aliases: []
category: kubernetes
tags:
  - kubectl-get
difficulty: intermediate
supportedOS:
  - linux
  - macos
  - unix
  - windows
supportedShells:
  - bash
  - zsh
  - sh
  - powershell
  - cmd
intentPhrases:
  - list kubernetes resources
  - get pod status
relatedCommands: []
alternatives: []
status: published
contentVersion: 1
lastUpdated: 2026-08-08
author: commandatlas
---

## What is it?

`kubectl get` lists one or many Kubernetes API resources (Pods, Services, Deployments, Nodes) within a cluster.

## Why does it exist?

`kubectl get` serves as the primary query interface for cluster state inspection in Kubernetes.

## Syntax

```bash
kubectl get [resource_type] [resource_name] [options]
```

## Flags

| Flag | Description                          | Example                           |
| ---- | ------------------------------------ | --------------------------------- |
| `-n` | Specify Kubernetes namespace         | `kubectl get pods -n kube-system` |
| `-o` | Output format (json, yaml, wide)     | `kubectl get pods -o wide`        |
| `-A` | List resources across all namespaces | `kubectl get pods -A`             |

## Examples

```bash
kubectl get pods -n default
```

> Lists all pods running in the default namespace.

## Real-World Scenarios

**Checking deployment health**: Verifying pod status and restart counts after deploying a new application version.

## When should it NOT be used?

- **Deep troubleshooting**: `kubectl describe` or `kubectl logs` provide detailed event history and container stdout logs.

## Alternatives

- **`k9s`**: Terminal-based UI for managing Kubernetes clusters interactively.

## How it works internally

`kubectl get` sends HTTP GET requests to the Kubernetes API server using kubeconfig credentials and prints formatted responses.

## Performance Notes

Fast query performance backed by etcd cache inside the API server.

## Security Notes

Ensure RBAC permissions follow least-privilege principles when granting cluster read access.

## Common Mistakes

- **Forgetting namespace scope**: Omitting `-n` queries only the `default` namespace, missing resources in dedicated namespaces.

## Best Practices

- Use `-o yaml` or `-o json` when exporting resource manifests for backup or GitOps templates.

## Interview Questions

**Q:** How do you get extended pod info including Node IP and IP addresses?
**A:** `kubectl get pods -o wide`

## Practice Problems

**Problem:** List all running services across all cluster namespaces.
**Solution:** `kubectl get svc -A`

## References

- [Kubectl get documentation](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get)
