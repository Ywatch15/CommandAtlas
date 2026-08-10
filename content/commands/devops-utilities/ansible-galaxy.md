---
slug: ansible-galaxy
name: ansible-galaxy
aliases: []
category: devops-utilities
tags: [ansible, galaxy, roles, collections, packaging, sharing]
difficulty: intermediate
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'install ansible roles'
  - 'manage ansible collections'
  - 'download shared galaxy roles'
  - 'publish ansible collection'
  - 'initialize ansible role structure'
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`ansible-galaxy` is a command-line utility used to create, install, remove, and manage Ansible roles and collections from Galaxy—Ansible's community-driven sharing hub—or from direct Git and tarball sources. It automates the packaging and dependency resolution of reusable automation code.

## Why does it exist?

Writing complex automation from scratch for standard software stacks (like PostgreSQL, Docker, or Kubernetes) is inefficient and repetitive. The Ansible community publishes pre-packaged, standardized automation units called **Roles** and **Collections**. `ansible-galaxy` exists to bridge this gap, providing a package management interface to download, version-control, and integrate community-shared automation code directly into local project directories.

## Syntax

```bash
ansible-galaxy <command> <subcommand> [options]
ansible-galaxy role install <role_name> [-r requirements.yml]
ansible-galaxy collection install <collection_name>
```

## Flags

| Flag                        | Description                                                                                 | Example                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `-r`, `--role-file <path>`  | Installs roles or collections defined in an external YAML requirements file.                | `ansible-galaxy role install -r requirements.yml`                                     |
| `-p`, `--roles-path <path>` | Specifies the destination directory path where downloaded roles will be installed.          | `ansible-galaxy role install geerlingguy.nginx -p ./roles/`                           |
| `-f`, `--force`             | Overwrites existing installed roles or collections if version conflicts or updates occur.   | `ansible-galaxy role install geerlingguy.mysql -f`                                    |
| `--ignore-errors`           | Ignores download or installation errors for individual roles, continuing batch execution.   | `ansible-galaxy role install -r requirements.yml --ignore-errors`                     |
| `--no-deps`                 | Skips automatic downloading and installation of dependent roles listed in metadata.         | `ansible-galaxy role install geerlingguy.redis --no-deps`                             |
| `-v`, `--verbose`           | Increases output verbosity for debugging package retrieval and API transactions.            | `ansible-galaxy role install geerlingguy.docker -v`                                   |
| `--server <url>`            | Specifies an alternate custom Ansible Galaxy API server URL.                                | `ansible-galaxy collection install namespace.coll --server https://galaxy.custom.com` |
| `--token <key>`             | Provides an API token for publishing collections or authenticating against private servers. | `ansible-galaxy collection publish coll-1.0.0.tar.gz --token=XYZ`                     |
| `--init-path <path>`        | Specifies the destination directory when creating a new role template structure.            | `ansible-galaxy role init my_custom_role --init-path ./roles/`                        |
| `--collections-path <path>` | Sets the target directory for installing Ansible collections.                               | `ansible-galaxy collection install amazon.aws --collections-path ./collections/`      |
| `--help`                    | Outputs brief usage documentation and supported subcommand options.                         | `ansible-galaxy role install --help`                                                  |

## Examples

```bash
ansible-galaxy role install geerlingguy.nginx
```

> This downloads and installs the popular Nginx community role maintained by Jeff Geerling into your default local `./roles/` directory.

```bash
ansible-galaxy role install -r requirements.yml -p ./roles/
```

> This reads a `requirements.yml` manifest file and batch-installs all listed external roles into the specified local `./roles/` directory.

```bash
ansible-galaxy collection install amazon.aws
```

> This downloads and installs the official `amazon.aws` collection from Ansible Galaxy, providing dozens of modules and plugins for managing AWS infrastructure.

```bash
ansible-galaxy role init my_custom_role
```

> This scaffolds a standard, production-ready directory structure (`tasks/`, `handlers/`, `vars/`, `defaults/`, `meta/`) for authoring a brand-new reusable Ansible role locally.

```bash
ansible-galaxy role remove geerlingguy.apache
```

> This uninstalls and deletes the specified role from your local project directory structure.

## Real-World Scenarios

**Bootstrapping Project Dependencies from Requirements Files**

```bash
ansible-galaxy role install -r requirements.yml && ansible-galaxy collection install -r collections.yml
```

> Continuous integration pipelines and development environments use requirements manifests to automatically pull down all prerequisite community roles and cloud collections required to execute project playbooks.

**Scaffolding New Reusable Automation Modules**

```bash
ansible-galaxy role init security_hardening
```

> Platform engineers authoring custom internal standards initialize standardized directory layouts for roles using `ansible-galaxy role init`, ensuring uniform code organization across teams.

**Updating Enterprise Shared Automation Repositories**

```bash
ansible-galaxy role install -r requirements.yml --force
```

> Operations teams update local dependencies to their latest upstream versions by running requirements installations with the force flag, ensuring security patches in community roles are applied.

## When should it NOT be used?

- **Managing general operating system packages (like apt or yum packages):** **Reason:** `ansible-galaxy` manages Ansible roles and collections, not system software libraries or OS binaries. **Use instead:** Package manager modules (`apt`, `yum`, `pip`) inside playbooks.
- **Version controlling custom application source code:** **Reason:** Galaxy is tailored specifically for Ansible automation packaging; it is not a general-purpose source code repository. **Use instead:** Git and GitHub/GitLab.

## Alternatives

- `git submodule`: Git's native dependency inclusion tool. **Tradeoff:** Git submodules allow you to pin roles directly to specific Git commit hashes, but lack automated dependency resolution and Galaxy registry integration provided by `ansible-galaxy`.
- `pip`: Python package manager. **Tradeoff:** `pip` manages Python libraries and CLI tools, whereas `ansible-galaxy` is scoped specifically to Ansible role and collection bundles.

## How it works internally

When you execute `ansible-galaxy`, the utility parses your subcommand and arguments, initializing an HTTP client that communicates with the Ansible Galaxy REST API backend or direct Git endpoints.

When installing a role (e.g., `geerlingguy.nginx`), Ansible queries the Galaxy API to resolve the repository source URL (typically hosted on GitHub). It then clones or downloads the tarball archive of the role into a temporary staging directory.

Next, Ansible parses the role's `meta/main.yml` file to identify any recursive dependencies listed by the author, automatically triggering secondary downloads for those dependent roles. Finally, it unpacks and moves the files into the designated `--roles-path` directory. Collections follow a similar workflow, compiling into namespace-structured directories under `--collections-path`. The command exits with `0` upon successful installation, or non-zero if network failures or invalid package names occur.

## Performance Notes

- Installing large collections containing hundreds of embedded modules can take several seconds depending on network bandwidth and GitHub API rate limits.
- Committing downloaded community roles directly into version control versus ignoring them via `.gitignore` and installing them dynamically via `requirements.yml` impacts repository size and CI build times.

## Security Notes

- **Untrusted Upstream Code Execution:** Downloading third-party roles from Ansible Galaxy without auditing code introduces severe security risks, as malicious actors can publish compromised roles containing backdoor execution scripts.
- **API Token Protection:** When publishing internal collections to private Galaxy servers using `--token`, ensure tokens are stored securely in environment variables rather than exposed in terminal history.

## Common Mistakes

- **Forgetting the requirements file dash format:** Writing incorrect YAML syntax inside `requirements.yml`. **Why it's wrong:** Ansible expects a specific list structure containing `src`, `name`, or `version` keys; malformed YAML causes installation parsing crashes.
- **Checking downloaded roles into Git repositories:** Committing gigabytes of community roles into your project's Git history. **Why it's wrong:** It bloats repository storage. Best practice is to list dependencies in `requirements.yml` and install them dynamically during CI/CD builds.
- **Ignoring collection namespace prefixes:** Failing to use the full namespaced path when calling modules from an installed collection in a playbook. **Why it's wrong:** Ansible cannot resolve module execution paths without explicit namespace declaration (e.g., `amazon.aws.ec2_instance`).

## Best Practices

- Always maintain a version-pinned `requirements.yml` file to guarantee repeatable, deterministic builds across development and production environments.
- Add the default `./roles/` and `./collections/` installation directories to your project's `.gitignore` file to keep your source control clean.
- Thoroughly review the source code and rating of community roles downloaded from Galaxy before executing them with root privileges in production environments.

## Interview Questions

- _Query:_ What is the functional difference between an Ansible **Role** and an Ansible **Collection** when managed via `ansible-galaxy`?
  - _A:_ A **Role** is a traditional, self-contained directory structure for organizing tasks, handlers, variables, and templates into reusable units. A **Collection** is a modern, broader packaging format that can bundle multiple roles, plugins, modules, and documentation into a single standardized distribution namespace.
- _Query:_ Why is checking downloaded third-party roles directly into Git source control considered an anti-pattern in Ansible workflows?
  - _A:_ Checking in third-party code bloats the repository size and duplicates dependency management. The industry standard is to define dependencies inside a lightweight `requirements.yml` manifest file, commit only the manifest to Git, and run `ansible-galaxy role install` dynamically during build or deployment stages.
- _Query:_ How does `ansible-galaxy` handle recursive dependencies when installing a complex community role?
  - _A:_ During installation, `ansible-galaxy` parses the target role's `meta/main.yml` metadata file. If the author specified dependent roles, Ansible automatically triggers recursive download and installation routines for those required packages before finalizing setup.

## Practice Problems

- _Problem:_ Install a community role named `geerlingguy.git` using `ansible-galaxy`, placing it into a custom local directory path `./custom_roles/`.
  - _Hint:_ Combine the role installation command with the custom path flag.
  - _Solution:_ `ansible-galaxy role install geerlingguy.git -p ./custom_roles/` (This downloads the git role and installs it directly into the specified target directory).
- _Problem:_ Batch-install all roles and collections defined in an external manifest file named `requirements.yml`.
  - _Hint:_ Use the role installation command paired with the requirements file flag.
  - _Solution:_ `ansible-galaxy role install -r requirements.yml` (This reads the manifest and installs every listed dependency automatically).

## References

- [Ansible Documentation - Ansible Galaxy User Guide](https://docs.ansible.com/ansible/latest/galaxy/user_guide.html)
- [Ansible Galaxy Hub](https://galaxy.ansible.com/)
