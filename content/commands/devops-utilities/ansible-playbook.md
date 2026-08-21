---
slug: ansible-playbook
name: ansible-playbook
aliases: []
category: devops-utilities
tags:
  - ansible
  - playbook
  - automation
  - configuration-management
  - yaml
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
  - run an ansible playbook
  - execute yaml automation tasks
  - apply configuration management playbook
  - provision infrastructure playbook
  - run automated playbook script
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`ansible-playbook` is the core execution utility for running structured YAML playbooks in Ansible. It translates multi-task orchestration workflows, roles, variables, and handlers into sequential, idempotent configuration management actions executed across remote server inventories.

## Why does it exist?

While ad-hoc Ansible commands are useful for quick checks, real-world infrastructure orchestration requires complex, multi-tier workflows—such as installing dependencies, configuring firewalls, deploying application code, and restarting services in a specific dependent order. `ansible-playbook` exists to fill this architectural gap, providing an idempotent execution engine that reads declarative YAML playbooks and reconciles remote system states predictably.

## Syntax

```bash
ansible-playbook <playbook.yml> [-i inventory] [--extra-vars "vars"] [options]
```

## Flags

| Flag                           | Description                                                                                                | Example                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `-i`, `--inventory <path>`     | Specifies the target inventory file or host list.                                                          | `ansible-playbook site.yml -i production.ini`                 |
| `-e`, `--extra-vars <vars>`    | Sets additional variables passed into the playbook execution context.                                      | `ansible-playbook deploy.yml -e "version=v1.2.0"`             |
| `--tags <tags>`                | Executes only playbook tasks tagged with the specified comma-separated tag names.                          | `ansible-playbook site.yml --tags "nginx,ssl"`                |
| `--skip-tags <tags>`           | Skips execution of tasks tagged with the specified comma-separated tag names.                              | `ansible-playbook site.yml --skip-tags "slow,backup"`         |
| `--check`                      | Runs the playbook in dry-run mode, reporting what changes _would_ be made without altering remote systems. | `ansible-playbook site.yml --check`                           |
| `--diff`                       | Displays file differences (unified diffs) when configuration files are modified on remote hosts.           | `ansible-playbook site.yml --diff`                            |
| `-b`, `--become`               | Enables privilege escalation (runs tasks with root or sudo privileges).                                    | `ansible-playbook site.yml -b`                                |
| `-k`, `--ask-pass`             | Prompts interactively for the SSH connection password.                                                     | `ansible-playbook site.yml -k`                                |
| `-K`, `--ask-become-pass`      | Prompts interactively for the privilege escalation (sudo) password.                                        | `ansible-playbook site.yml -K`                                |
| `--vault-password-file <path>` | Specifies a file containing the decryption password for encrypted Ansible Vault files.                     | `ansible-playbook site.yml --vault-password-file .vault_pass` |
| `-l`, `--limit <subset>`       | Restricts playbook execution to a subset of hosts within the inventory.                                    | `ansible-playbook site.yml -l "web01"`                        |
| `-v`, `--verbose`              | Increases output verbosity (supports `-vv`, `-vvv`, `-vvvv` for deep debugging).                           | `ansible-playbook site.yml -vvv`                              |

## Examples

```bash
ansible-playbook site.yml
```

> This executes the main `site.yml` playbook against the default inventory file, orchestrating all defined tasks, roles, and handlers sequentially across target servers.

```bash
ansible-playbook deploy.yml --check --diff
```

> This runs the deployment playbook in dry-run mode (`--check`) while printing file content changes (`--diff`), allowing you to review modifications safely before applying them.

```bash
ansible-playbook setup-server.yml -i production.ini -b -K
```

> This executes a server setup playbook using a custom inventory file (`production.ini`), enabling privilege escalation (`-b`) and interactively prompting for your sudo password (`-K`).

```bash
ansible-playbook update.yml --tags "packages,config" -e "env=production"
```

> This executes only the tasks tagged with `packages` and `config` within the update playbook, injecting an extra variable (`env=production`) into the execution scope.

```bash
ansible-playbook site.yml --vault-password-file ~/.vault_pass -l "db_cluster"
```

> This runs a playbook against a restricted host subset (`db_cluster`) while automatically decrypting secure variables using a local vault password file.

## Real-World Scenarios

**Automated Infrastructure Provisioning and Configuration**

```bash
ansible-playbook site.yml -i inventories/production -b
```

> DevOps teams execute structured Ansible playbooks inside continuous deployment pipelines to configure newly provisioned cloud virtual machines, installing runtimes, security hardening, and application packages.

**Safe Pre-Flight Validation via Dry Runs**

```bash
ansible-playbook site.yml --check --diff
```

> System administrators run playbooks with checking and diff flags prior to production releases to inspect exactly what file lines will change, preventing unintended configuration overwrites.

**Targeted Maintenance and Hotfix Application**

```bash
ansible-playbook patch-security.yml --tags "openssl" -b
```

> When critical zero-day vulnerabilities emerge, operations engineers execute specific tagged tasks within a security playbook to patch vulnerable libraries across server fleets instantly.

## When should it NOT be used?

- **Simple, instantaneous one-off ad-hoc command execution:** **Reason:** Creating a full YAML playbook for a single quick command (like checking disk space on one server) introduces unnecessary file overhead. **Use instead:** `ansible` ad-hoc commands.
- **Declarative lifecycle provisioning of underlying cloud provider infrastructure (VPCs, Subnets):** **Reason:** While Ansible has cloud modules, it is primarily a configuration management and orchestration tool rather than a state-graph infrastructure provisioner. **Use instead:** Terraform or OpenTofu.

## Alternatives

- `terraform`: Declarative infrastructure-as-code provisioning tool. **Tradeoff:** Terraform excels at managing raw cloud infrastructure resources (VMs, networks, buckets) using state files, whereas Ansible excels at configuring the operating systems and software _inside_ those servers once running.
- `ansible` (Ad-hoc): Single command execution engine. **Tradeoff:** Ad-hoc commands are great for quick checks, but lack the structured, multi-step orchestration and idempotency features of playbooks.

## How it works internally

When you execute `ansible-playbook`, the utility parses the target YAML file, validates syntax against Ansible's schema, and compiles the playbook into an internal execution graph.

It reads the inventory file, resolves host patterns, and initializes a multi-threaded worker pool. For each play in the playbook, Ansible executes tasks in a strict linear sequence across all targeted hosts. It connects via SSH, transfers templated Python modules (using Jinja2 for variable rendering), executes them remotely, and evaluates the resulting JSON payload.

If a task reports that a system change occurred (`changed: true`), Ansible triggers any associated handlers (such as service restarts) at the end of the play. The command returns an exit code of `0` if all plays complete successfully, `1` if an unhandled error occurs, or `2` if a host failed or unreachable warning was triggered.

## Performance Notes

- Playbook execution speed can be heavily optimized by tuning the `forks` parameter in `ansible.cfg` and enabling SSH pipelining (`pipelining = True`), which reduces the number of SSH round-trips required to transmit module code.
- Extensive use of Jinja2 template rendering across thousands of inventory hosts can introduce CPU overhead on the control node.

## Security Notes

- **Plaintext Secret Exposure:** Hardcoding passwords, database URIs, or API tokens in plaintext inside playbook files or variable files represents a severe security risk. Always encrypt sensitive strings using `ansible-vault`.
- **Privilege Escalation Misconfigurations:** Playbooks running tasks with unrestricted root privileges (`become: yes`) can execute destructive commands if input variables are poorly sanitized or unconstrained.

## Common Mistakes

- **Writing non-idempotent custom shell tasks:** Using the `shell` module to append lines to a configuration file without checking if they already exist. **Why it's wrong:** Every time the playbook runs, it duplicates the lines, violating Ansible's core principle of idempotency. Use dedicated modules like `lineinfile` instead.
- **Forgetting to pass vault passwords:** Running a playbook containing encrypted variables without specifying `--vault-password-file` or `--ask-vault-pass`. **Why it's wrong:** Ansible halts execution immediately, throwing an unencrypted vault decryption error.
- **Mismanaging task serialization:** Assuming tasks across separate plays run simultaneously rather than sequentially. **Why it's wrong:** Plays execute in strict order; failing to understand play-level boundaries leads to race conditions in deployment logic.

## Best Practices

- Always design playbook tasks to be fully idempotent, leveraging native modules (`apt`, `template`, `file`) instead of falling back on raw `shell` or `command` modules.
- Store sensitive configuration data exclusively in encrypted Ansible Vault files, keeping secrets entirely out of public Git repositories.
- Incorporate `--check` and `--diff` flags into your CI/CD deployment pipelines to catch unintended infrastructure drifts and syntax errors before production applies.

## Interview Questions

**Q:** What is idempotency in the context of `ansible-playbook`, and why is it a foundational design principle?
**A:** Idempotency means that an operation can be applied multiple times resulting in the exact same system state without causing unintended side effects. If a system is already correctly configured, running an idempotent playbook task reports `ok` (`changed: false`) rather than modifying the system again, ensuring predictable and repeatable deployments.
**Q:** How does Ansible handle handlers, and when are they triggered during playbook execution?
**A:** Handlers are tasks that are identical to regular tasks except they only execute when explicitly notified by another task that reports a state change (`changed: true`). Handlers are batched and executed at the very end of each play, ensuring services (like Nginx) are restarted only once even if multiple configuration files were modified.
**Q:** What is the performance benefit of enabling SSH pipelining in `ansible.cfg` when running playbooks?
**A:** SSH pipelining reduces the number of SSH operations required to execute a remote module by transferring the Python script directly to the remote shell's stdin instead of creating a temporary script file on disk and opening a separate SSH channel to execute it.

## Practice Problems

**Problem:** Execute a playbook named `site.yml` against a custom inventory file `production.ini` with privilege escalation enabled.
**Hint:** Combine the playbook file argument with the inventory flag and the become flag.
**Solution:** `ansible-playbook site.yml -i production.ini -b` (This runs the playbook against the specified inventory as root via sudo).
**Problem:** Perform a dry-run check of a deployment playbook named `deploy.yml` while viewing detailed file configuration diffs.
**Hint:** Combine the playbook argument with both the check mode flag and the diff flag.
**Solution:** `ansible-playbook deploy.yml --check --diff` (The `--check` flag simulates execution without changing systems, and `--diff` displays exact line changes).

## References

- [Ansible Documentation - Working With Playbooks](https://docs.ansible.com/ansible/latest/user_guide/playbooks.html)
- [Ansible Documentation - Intro to Playbooks](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html)
