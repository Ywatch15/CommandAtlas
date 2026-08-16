---
slug: gcloud-compute-ssh
name: gcloud compute ssh
aliases: []
category: cloud-cli
tags:
  - gcp
  - compute
  - ssh
  - gce
  - remote-access
  - security
  - cloud
  - gcloud
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
intentPhrases:
  - ssh into gcp vm
  - connect to compute engine instance
  - remote access google cloud vm
  - tunnel ssh via iap
  - access internal gcp vm
relatedCommands:
  - gcloud-compute-instances-list
  - ssh
alternatives:
  - ssh
status: draft
---

## What is it?

`gcloud compute ssh` is a specialized wrapper command used to securely connect to Google Compute Engine (GCE) Virtual Machines. It abstracts away the complex key management required for cloud infrastructure by automatically generating temporary SSH key pairs, injecting the public key into the target VM's metadata (or interacting with the OS Login API), and seamlessly establishing the underlying native SSH connection using the correct IP routing and firewall traversal mechanisms.

## Why does it exist?

Traditional SSH requires administrators to manually generate keys, distribute them to servers, and manage `authorized_keys` files—a process that does not scale dynamically in ephemeral cloud environments. Furthermore, connecting to VMs without public IP addresses traditionally requires maintaining vulnerable jump-hosts. `gcloud compute ssh` exists to fully automate key lifecycle management using Google Cloud IAM as the source of truth, and integrates directly with Identity-Aware Proxy (IAP) to securely tunnel TCP connections to private instances without exposing port 22 to the public internet.

## Syntax

```bash
gcloud compute ssh [USER@]INSTANCE_NAME [options] [-- SSH_ARGS]
```

## Flags

| Flag                   | Description                                                                                                                                     | Example                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `--zone`               | Specifies the availability zone of the target instance. Avoids prompting the user if multiple instances share a name globally.                  | `gcloud compute ssh web-01 --zone=us-central1-a`         |
| `--project`            | Targets an instance in a specific GCP project, overriding the active CLI configuration.                                                         | `gcloud compute ssh db-01 --project=core-infra`          |
| `--tunnel-through-iap` | Explicitly routes the SSH TCP traffic through Google's Identity-Aware Proxy, enabling connection to VMs lacking external IP addresses.          | `gcloud compute ssh internal-app --tunnel-through-iap`   |
| `--internal-ip`        | Forces the connection to route via the VM's private IP address. Useful when initiating the connection from another machine inside the VPC.      | `gcloud compute ssh worker-node --internal-ip`           |
| `--command`            | Executes a specific shell command on the remote instance and immediately disconnects, returning the output locally.                             | `gcloud compute ssh web-01 --command="uptime"`           |
| `--plain`              | Suppresses `gcloud`'s automatic key generation and metadata injection, forcing the command to rely solely on standard local SSH configurations. | `gcloud compute ssh web-01 --plain`                      |
| `--ssh-key-file`       | Instructs the CLI to use a specific private key file instead of the default auto-generated `~/.ssh/google_compute_engine` keys.                 | `gcloud compute ssh web-01 --ssh-key-file=~/.ssh/my_key` |
| `--`                   | The double-dash separator. Any arguments following this are passed directly, unmodified, to the underlying OS `ssh` binary.                     | `gcloud compute ssh web-01 -- -L 8080:localhost:80`      |

## Examples

```bash
gcloud compute ssh my-web-server
```

> Connects to `my-web-server`. The CLI checks local SSH keys, updates the project or instance metadata to authorize the key, finds the external IP of the VM, and drops the user into an interactive shell session.

```bash
gcloud compute ssh ubuntu@database-node --zone=europe-west1-b
```

> Connects as the specific OS user `ubuntu` and explicitly provides the zone. Passing the zone dramatically speeds up connection times by preventing `gcloud` from querying the global API to locate the instance's whereabouts.

```bash
gcloud compute ssh private-worker --tunnel-through-iap
```

> Connects to a VM that sits on a private subnet with no external internet access. The CLI automatically negotiates a WebSocket tunnel with the GCP IAP service, encapsulating the SSH protocol over HTTPS (port 443) and bridging it to port 22 on the target VM.

```bash
gcloud compute ssh monitoring-node --command="tail -n 50 /var/log/syslog"
```

> Performs a headless execution. It connects to the VM, runs the requested log extraction command, prints the output to your local terminal, and cleanly terminates the SSH session. Excellent for quick auditing scripts.

```bash
gcloud compute ssh proxy-node -- -N -L 8888:localhost:8888
```

> Leverages the `--` separator to pass standard OpenSSH flags. This specific command establishes an SSH connection but executes no remote command (`-N`), instead binding local port 8888 and forwarding traffic securely through the tunnel to port 8888 on the `proxy-node`.

## Real-World Scenarios

**Secure Database Administration (IAP Tunneling)**

```bash
gcloud compute ssh bastion-host --tunnel-through-iap --project=secure-data -- -L 5432:10.0.1.5:5432
```

> A database administrator needs to connect to an internal Cloud SQL instance using pgAdmin on their laptop. Direct connection is impossible. They use `gcloud compute ssh` to connect to a private bastion host via IAP, using standard SSH port forwarding (`-L`) to tunnel their local port 5432 through the bastion directly to the internal database IP, establishing a fully encrypted, zero-public-IP administrative pathway.

**Automated Remote Fleet Patching**

```bash
for vm in $(gcloud compute instances list --format="value(name)" --filter="tags.items=patch-group"); do
    gcloud compute ssh $vm --zone=us-east4-a --command="sudo apt-get update && sudo apt-get upgrade -y"
done
```

> A system administrator uses bash to loop over a specific group of instances retrieved via the list command, utilizing the `--command` flag to non-interactively execute system updates across the fleet sequentially without ever opening a persistent terminal.

## When should it NOT be used?

- **Connecting to Non-GCP Servers:** **Do not use `gcloud` for general SSH.** It is tightly coupled to Google Compute Engine APIs. If you are connecting to an AWS EC2 instance or an on-premises server, use the standard `ssh` utility.
- **High-Volume Parallel Executions:** **Do not use `gcloud compute ssh` inside tight loops for 1,000+ servers.** The metadata propagation and IAP token negotiation add 2-5 seconds of overhead per invocation. For massive parallel execution, use Ansible or GCP OS Patch Management.
- **Immutable Infrastructure:** **Avoid SSHing into production instances to make manual changes.** In modern cloud-native environments (like Managed Instance Groups or Kubernetes), VMs are ephemeral. Manual changes will be wiped out when the VM auto-scales or restarts. Make changes via startup scripts or machine image updates instead.

## Alternatives

- **Standard OpenSSH (`ssh`):** **Best for static, long-lived environments.** If you utilize OS Login or pre-bake your public keys into golden images via Terraform, you can bypass `gcloud` entirely and just use `ssh user@ip`, avoiding API latency.
- **IAP Desktop:** **Best for Windows/RDP.** A Windows-native graphical application that wraps Identity-Aware Proxy functionality, primarily used to establish secure RDP (Remote Desktop Protocol) tunnels to Windows Server instances without exposing port 3389.

## How it works internally

`gcloud compute ssh` is a highly intelligent wrapper orchestrating several distinct Google Cloud APIs before invoking the native `ssh` binary.

1.  **Key Generation:** When invoked, the CLI checks `~/.ssh/` for existing `google_compute_engine` RSA/Ed25519 keys. If missing, it silently runs `ssh-keygen` to generate them.
2.  **OS Login vs. Metadata:** The CLI queries the instance (or project) to determine the authentication mode.
    - If **OS Login** is enabled, the CLI calls the OS Login API (`oslogin.googleapis.com`) to associate your public key directly with your Google IAM identity. The VM's PAM (Pluggable Authentication Module) dynamically queries this API to authorize your incoming SSH connection.
    - If relying on **Metadata**, the CLI calls the Compute Engine API to inject your public key into the `ssh-keys` field of the instance or project metadata. A Google-managed daemon (`google_guest_agent`) running inside the VM polls this metadata and appends your key to `~/.ssh/authorized_keys`.
3.  **Network Resolution:** The CLI resolves the target VM's external IP address.
4.  **IAP Tunneling (Optional):** If `--tunnel-through-iap` is used, the CLI executes a background Python script that initiates an authenticated WebSocket connection to `iap.googleapis.com`. It then instructs the local SSH client to use this Python script as a ProxyCommand, tunneling the standard SSH TCP traffic through the HTTPS WebSocket directly to the VM's internal IP.
5.  **Execution:** Finally, it constructs the massive native `ssh` command string with all required IdentityFiles, StrictHostKeyChecking overrides, and ProxyCommands, and hands execution over to the OS.

## Performance Notes

- **Metadata Propagation Delay:** If the CLI is forced to update project-level metadata to inject your SSH key, the command may pause for up to 10 seconds. This is because the guest agent inside the VM must poll the metadata server and rewrite the `authorized_keys` file before the SSH connection is allowed to proceed.
- **IAP Bandwidth Limits:** Tunneling SSH over IAP encapsulates TCP packets inside HTTPS WebSockets. While perfect for terminal sessions, it significantly degrades raw bandwidth and increases CPU overhead. Do not use IAP tunneling to transfer terabytes of data via `scp` or `rsync`; use internal VPC routing instead.

## Security Notes

- **Project-Wide Keys Risk:** In legacy metadata-based SSH, adding a key via `gcloud compute ssh` often applies it at the _project_ level. This means the key grants root access to _every_ VM in the project. Modern security mandates enabling **OS Login**, which ties SSH access strictly to IAM Role bindings (`roles/compute.osLogin` or `roles/compute.osAdminLogin`) rather than raw keys.
- **IAP Firewall Rules:** Using `--tunnel-through-iap` requires an explicit VPC firewall rule allowing ingress TCP traffic on port 22 from Google's exact IAP proxy IP range (`35.235.240.0/20`). It does not magically bypass the firewall; it merely changes the allowed source IP.
- **Temporary Key Expiration:** If using OS Login with 2-Step Verification, the public keys injected by the CLI are ephemeral. They automatically expire and are purged from the system after a short duration, ensuring stolen private keys are useless to attackers after the session ends.

## Common Mistakes

- **Assuming `--internal-ip` tunnels traffic**
  - _Mistake:_ Sitting at a coffee shop on public Wi-Fi, running `gcloud compute ssh db-node --internal-ip`, and having the connection instantly time out.
  - _Why:_ The `--internal-ip` flag simply tells the underlying `ssh` command to dial the `10.x.x.x` address. Because your laptop cannot route to Google's internal 10.x network over the public internet, the connection drops. You must use a VPN, Cloud Interconnect, or switch to `--tunnel-through-iap` to bridge the gap.
- **Failing to pass standard SSH flags correctly**
  - _Mistake:_ Running `gcloud compute ssh my-vm -L 8080:localhost:80` and getting an "unrecognized arguments" error from gcloud.
  - _Why:_ The `-L` flag belongs to OpenSSH, not `gcloud`. You must use the `--` double-dash separator to tell `gcloud` to stop parsing arguments and pass everything that follows directly to the `ssh` binary: `gcloud compute ssh my-vm -- -L 8080:localhost:80`.

## Best Practices

- **Enable OS Login globally:** Abandon project-level metadata keys. Enforce OS Login at the organization or project level (`gcloud compute project-info add-metadata --metadata enable-oslogin=TRUE`). This centralizes SSH authorization to IAM, enabling easy offboarding when employees leave the company.
- **Embrace IAP, disable Public IPs:** Remove external IP addresses from all backend and internal services. Force administrators to use `--tunnel-through-iap`. This reduces your public attack surface to zero, protecting your instances from automated port-22 botnet scanning.
- **Specify Zones:** Always append the `--zone` flag in scripts or daily workflows. If omitted, `gcloud` queries the global API to find the VM, which slows down the connection and prompts the user for clarification if multiple VMs share a name in different zones.

## Interview Questions

**Q: How does `gcloud compute ssh` allow you to connect to a Compute Engine instance that does not have an External IP address?**
**A:** By using the `--tunnel-through-iap` flag. The command uses the Identity-Aware Proxy (IAP) TCP forwarding feature. It authenticates your user identity via IAM, establishes a secure HTTPS WebSocket tunnel to the Google IAP edge infrastructure, and bridges that tunnel directly to the internal IP and port 22 of the target VM, encapsulating the SSH traffic.

**Q: You run `gcloud compute ssh my-vm --command="sudo systemctl restart nginx"`, but it fails because you are prompted for a sudo password. How does OS Login affect `sudo` privileges?**
**A:** When using OS Login, your sudo privileges are determined entirely by your Google Cloud IAM roles. If you only hold the `roles/compute.osLogin` role, you log in as a standard user without root privileges. To execute `sudo` commands seamlessly without a password, your identity must be granted the `roles/compute.osAdminLogin` IAM role.

## Practice Problems

**Problem:** You need to securely connect to a Compute Engine instance named `batch-processor` located in `us-west2-a`. The instance has no public IP address. Write the command to connect to it using the recommended Google proxy tunneling service.
**Hint:** Use the flag that specifies the exact zone, and the flag that routes traffic through Identity-Aware Proxy.
**Solution:**

```bash
gcloud compute ssh batch-processor --zone=us-west2-a --tunnel-through-iap
```

**Problem:** You are running a web server on port `3000` inside a VM named `dev-server`. You want to test it in your local laptop's browser. Write the command to establish an SSH connection that forwards your local port `8080` to the remote VM's port `3000`.
**Hint:** You need to pass standard OpenSSH port forwarding flags (`-L`) through `gcloud` using the correct argument separator.
**Solution:**

```bash
gcloud compute ssh dev-server -- -L 8080:localhost:3000
```

## References

- [gcloud compute ssh - Google Cloud CLI Documentation](https://cloud.google.com/sdk/gcloud/reference/compute/ssh)
- [Connecting to VMs using Identity-Aware Proxy](https://cloud.google.com/iap/docs/using-tcp-forwarding)
- [Managing OS Login](https://cloud.google.com/compute/docs/oslogin)
