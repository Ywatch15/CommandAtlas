---
slug: vagrant
name: vagrant
aliases: []
category: devops-utilities
tags:
  - virtual-machines
  - local-development
  - provisioning
  - environments
  - hashicorp
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
intentPhrases:
  - start local virtual machine
  - manage vagrant environment
  - ssh into vagrant box
  - provision local dev environment
  - stop running vagrant vm
relatedCommands: [packer, ansible]
alternatives: []
status: published
---

## What is it?

Vagrant is a command-line utility designed to build and manage localized virtual machine environments in a single, predictable workflow. By leveraging a declarative Ruby-based configuration file (`Vagrantfile`), it provides a highly reproducible way to configure hypervisors (like VirtualBox or Hyper-V), mount shared directories, expose networking ports, and execute software provisioning scripts, effectively eliminating the "it works on my machine" software development problem.

## Why does it exist?

Before containerization became ubiquitous, developing software required complex, machine-specific local installations of databases, web servers, and runtime environments. Alternatively, developers manually clicked through desktop hypervisor GUIs (like VirtualBox or VMware) to create VMs, resulting in undocumented, drifting environments that were impossible to share with teammates. Vagrant exists to codify the virtual machine lifecycle. By defining the hardware requirements, base OS image (box), and provisioning scripts in version control, any developer can type `vagrant up` and instantly possess an exact, functioning replica of the production environment running securely isolated on their local workstation.

## Syntax

```bash
vagrant <command> [options] [name|id]
```

## Flags

| Flag / Subcommand | Description                                                                                                                                   | Example                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `init`            | Initializes the current directory by creating a default `Vagrantfile`, optionally specifying a base "box" to use.                             | `vagrant init ubuntu/focal64` |
| `up`              | The primary execution command. Reads the `Vagrantfile`, provisions the hypervisor VM, configures networking, and runs setup scripts.          | `vagrant up`                  |
| `ssh`             | Automatically negotiates SSH keys and drops the user directly into an interactive terminal session inside the running virtual machine.        | `vagrant ssh`                 |
| `halt`            | Gracefully shuts down the running virtual machine by sending a standard ACPI power-off signal to the guest OS.                                | `vagrant halt`                |
| `suspend`         | Pauses the virtual machine, saving its current RAM/execution state to disk so it can be resumed instantly later.                              | `vagrant suspend`             |
| `resume`          | Un-pauses a suspended virtual machine, restoring its execution state exactly where it was left off.                                           | `vagrant resume`              |
| `destroy`         | Destroys the virtual machine entirely, permanently deleting the virtual hard disks and freeing up local host storage.                         | `vagrant destroy`             |
| `status`          | Outputs the current execution state of the Vagrant environments managed by the `Vagrantfile` in the current directory.                        | `vagrant status`              |
| `reload`          | Equivalant to running `halt` followed by `up`. Crucial for applying changes made to the `Vagrantfile` (like port forwarding) to an active VM. | `vagrant reload`              |
| `--provision`     | Forces the provisioning scripts (Shell, Ansible, Chef) to execute. Normally, provisioners only run on the very first `vagrant up`.            | `vagrant reload --provision`  |
| `-f`, `--force`   | Bypasses interactive `[y/N]` confirmation prompts. Mostly used with `destroy` for automated cleanup.                                          | `vagrant destroy -f`          |

## Examples

```bash
vagrant init hashicorp/bionic64
```

> Bootstraps a new project. It creates a `Vagrantfile` in the current working directory, pre-configured to download and use the official HashiCorp Ubuntu 18.04 LTS base image.

```bash
vagrant up
```

> The core workflow command. It parses the `Vagrantfile`, checks if the VM exists, and if not, downloads the base box, imports it into VirtualBox/Hyper-V, configures the synced folders, boots the OS, and executes any defined shell or Ansible provisioners.

```bash
vagrant ssh
```

> Replaces manual connection strings. Because Vagrant injects a specific insecure SSH key pair into the VM during boot, this command transparently handles the connection, dropping you instantly into the guest OS terminal as the `vagrant` user.

```bash
vagrant reload --provision
```

> A frequent developer operation. If you modify an `install.sh` script referenced in the `Vagrantfile`, or if you change an exposed network port, you must run this command. It gracefully reboots the VM to apply network changes and forces the provisioning scripts to re-execute.

```bash
vagrant destroy -f
```

> Cleans up the environment, permanently deleting the virtual machine and its disks without asking for confirmation. Crucial for freeing up the ~10-20GB of local disk space a heavy VM can consume when a project is paused.

## Real-World Scenarios

**Standardizing Local Team Environments**

```bash
git clone [https://github.com/company/legacy-monolith.git](https://github.com/company/legacy-monolith.git)
cd legacy-monolith
vagrant up
```

> A company maintains a monolithic PHP application that requires specific, outdated versions of Apache, MySQL, and Redis. Instead of forcing new hires to pollute their MacBooks with legacy software, the repository includes a `Vagrantfile`. The new hire types `vagrant up`, and within minutes, they have a fully configured Ubuntu VM running the exact legacy stack, with their local code editor syncing files directly into the VM via Vagrant's synced folders.

**Multi-Node Network Simulations**

```bash
# Vagrantfile defines "web", "db", and "cache" nodes
vagrant up
vagrant ssh db
```

> Network engineers or developers building distributed systems utilize Vagrant's multi-machine capabilities. A single `Vagrantfile` can orchestrate the simultaneous boot of three distinct VMs, automatically configuring a private virtual network so they can communicate seamlessly. The developer can then SSH into the `db` node to monitor connections from the `web` node locally.

## When should it NOT be used?

- **Production Deployments:** **Do not use Vagrant for production.** It is strictly a local development and testing orchestration tool. It defaults to insecure SSH keys and overly permissive network configurations designed for ease-of-use, not public-facing security. Use Terraform for production provisioning.
- **Containerized Microservices:** **Do not use Vagrant if your architecture is fully Dockerized.** If you are developing 12-factor apps in containers, `docker-compose` or DevContainers provide significantly lighter, faster, and more native orchestration than booting full heavyweight Virtual Machines via Vagrant.
- **Heavy Compute Machine Learning:** VMs incur significant hypervisor overhead. Passing native local GPUs through a hypervisor into a Vagrant box for local AI/ML training is notoriously difficult and heavily degrades performance compared to running natively or using WSL2/Docker with GPU passthrough.

## Alternatives

- **Docker Compose / DevContainers:** **Best for modern application development.** Provides environment isolation via lightweight Linux namespaces (containers) instead of full hardware virtualization, drastically reducing boot times and RAM consumption.
- **Multipass:** **Best for pure Ubuntu VMs.** A tool specifically built by Canonical to instantly launch Ubuntu VMs on Windows, Mac, and Linux with significantly less configuration overhead than Vagrant.
- **Minikube / Kind:** **Best for Kubernetes testing.** If the goal of the VM is simply to run a local Kubernetes cluster, these dedicated tools are highly optimized for that exact task.

## How it works internally

Vagrant is written in Ruby. When you type `vagrant up`, the CLI engine parses the `Vagrantfile` (which is technically a valid Ruby script) evaluating the DSL syntax to build an execution plan.

It relies on a plugin architecture with three core component types:

1.  **Providers:** The adapter that translates Vagrant configurations into hypervisor-specific commands. The default provider is Oracle VirtualBox (via the `VBoxManage` CLI). Other providers include Hyper-V, VMware, and Libvirt.
2.  **Communicators:** The mechanism used to talk to the guest OS once it boots. Vagrant overwhelmingly relies on SSH for Linux and WinRM for Windows guests.
3.  **Provisioners:** Hooks that execute software once the communicator establishes a connection. Vagrant uploads scripts or playbooks (Shell, Ansible, Chef) and executes them inside the guest OS.

Crucially, Vagrant handles file synchronization. By default, it maps the directory containing your `Vagrantfile` on the host machine to `/vagrant` inside the guest VM. This allows developers to use their native host IDE (like VS Code or IntelliJ) to edit source code, while the execution of that code happens securely within the VM's isolated environment.

## Performance Notes

- **Synced Folder Penalties:** The default synced folder mechanism (VirtualBox Shared Folders) can be excruciatingly slow, causing `npm install` or massive file reads to take 10x longer than native execution. For massive codebases, overriding the sync type to `nfs` (on Mac/Linux) or `smb` (on Windows) is critical for performance.
- **Heavyweight VM Overhead:** Unlike containers, every `vagrant up` reserves dedicated RAM and CPU allocations from the host machine and boots a full Linux kernel. Running 3 or 4 Vagrant boxes simultaneously will quickly starve a standard 16GB laptop of memory.

## Security Notes

- **Insecure Default Key:** Vagrant injects a globally known, publicly published SSH public key into the `~/.ssh/authorized_keys` file of the `vagrant` user inside the VM so `vagrant ssh` works instantly without password prompts. Never expose a Vagrant box directly to a public IP address, or it will be compromised instantly.
- **Private Networks:** Prefer using Vagrant's `private_network` configurations over `public_network`. Public networks bridge the VM directly to your local physical Wi-Fi/Ethernet router, exposing vulnerable development services directly to anyone else on your local coffee shop or corporate network.

## Common Mistakes

- **Running `vagrant up` in the wrong directory**
  - _Mistake:_ Opening a terminal in `~`, running `vagrant up`, and getting an error that no `Vagrantfile` exists.
  - _Why:_ Vagrant commands are highly context-sensitive. They only operate on the environment defined by the `Vagrantfile` in your current working directory. You must always `cd` into your project directory before executing commands.
- **Forgetting to destroy unused VMs**
  - _Mistake:_ Having 15 different projects, running `vagrant up` in all of them over a month, and suddenly running out of laptop disk space.
  - _Why:_ Closing the terminal does not delete the VM. It remains powered off on the hypervisor's virtual disk. You must proactively run `vagrant destroy` in old project folders to reclaim the 10-20GB VDI disk files.
- **Expecting provisioners to run on every boot**
  - _Mistake:_ Changing an `install.sh` script, running `vagrant halt` then `vagrant up`, and wondering why the new software isn't installed.
  - _Why:_ Vagrant only runs provisioners automatically during the _very first_ `vagrant up` command. For subsequent boots, you must explicitly pass the `--provision` flag (e.g., `vagrant up --provision`) to force the scripts to re-execute.

## Best Practices

- **Keep Vagrantfiles in Version Control:** Always commit your `Vagrantfile` to Git. This ensures that every developer checking out the repository is guaranteed to boot the exact same infrastructure baseline.
- **Use `.gitignore` for the `.vagrant` directory:** Vagrant generates a hidden `.vagrant` folder containing local VM IDs and machine state data. This must be ignored in version control, as the IDs are unique to each developer's specific laptop.
- **Write Idempotent Provisioning Scripts:** Your shell scripts or Ansible playbooks should be written so they can be run 100 times without failing or creating duplicate data. This allows developers to safely run `vagrant provision` whenever configurations change.

## Interview Questions

**Q: Explain the difference between `vagrant halt` and `vagrant suspend`.**
**A:** `vagrant halt` gracefully powers down the virtual machine by sending an ACPI shutdown signal. This releases RAM and CPU, but requires a full OS boot sequence the next time you bring it up. `vagrant suspend` pauses the virtual machine, saving the current contents of its RAM to the physical disk. When resumed, it restores instantly exactly where it left off, but it consumes more disk space to store the RAM state.

**Q: A developer adds a new port forwarding rule to their `Vagrantfile` mapping host port 8080 to guest port 80. The VM is currently running. What exact command must they execute for this new rule to take effect?**
**A:** They must execute `vagrant reload`. Port forwarding rules and network interfaces are configured by the underlying hypervisor (like VirtualBox) during the VM's boot phase. Simply restarting services inside the guest OS is insufficient; the VM itself must be gracefully halted and booted again by Vagrant to apply the network alterations.

## Practice Problems

**Problem:** You are starting a new project. You need to create a fresh `Vagrantfile` in your current directory configured to use the `centos/8` box image provided by HashiCorp. Write the single command to bootstrap this file.
**Hint:** Use the subcommand designed for initialization.
**Solution:**

```bash
vagrant init centos/8
```

**Problem:** You have updated your `Vagrantfile` to include a new Ansible provisioning step. Your virtual machine is already actively running. Write the command to restart the machine to apply network changes AND force the new Ansible script to execute during the boot process.
**Hint:** Combine the reboot subcommand with the explicit provision flag.
**Solution:**

```bash
vagrant reload --provision
```

## References

- [Vagrant CLI Documentation](https://developer.hashicorp.com/vagrant/docs/cli)
- [Vagrant Synced Folders](https://developer.hashicorp.com/vagrant/docs/synced-folders)
- [Vagrant Provisioning](https://developer.hashicorp.com/vagrant/docs/provisioning)
