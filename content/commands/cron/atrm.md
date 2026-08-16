---
slug: atrm
name: atrm
aliases:
  - at -d
category: cron
tags:
  - cron
  - scheduling
  - queue
  - remove
  - jobs
difficulty: beginner
supportedOS:
  - linux
  - macos
  - unix
supportedShells:
  - bash
  - zsh
  - sh
intentPhrases:
  - delete scheduled at job
  - remove job from at queue
  - cancel pending deferred task
  - delete at queue entry
  - cancel at job by id
relatedCommands: []
alternatives: []
status: published
---

## What is it?

`atrm` is a command-line utility used to delete or cancel pending jobs from the system's `at` scheduling queue by specifying their unique numeric job identification numbers.

## Why does it exist?

When deferred tasks are erroneously scheduled or become redundant before their execution window arrives, systems require an explicit mechanism to purge them from the queue. `atrm` exists to bridge this operational gap, providing a direct interface to unlink and destroy pending job files from the system spool directory.

## Syntax

```bash
atrm [-V] job [job...]
```

## Flags

| Flag        | Description                                                                                  | Example            |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------ |
| `-V`        | Prints the version number of the atrm utility to standard error and exits.                   | `atrm -V`          |
| `-f`        | Forces silent deletion without prompting or reporting errors for non-existent jobs.          | `atrm -f 14 15 16` |
| `-i`        | Interactive mode, prompting the user for confirmation before deleting each specified job ID. | `atrm -i 12`       |
| `-v`        | Verbose mode, printing confirmation messages as jobs are successfully removed.               | `atrm -v 18`       |
| `-h`        | Displays brief usage documentation and supported command-line options.                       | `atrm -h`          |
| `--help`    | Outputs standard help documentation details.                                                 | `atrm --help`      |
| `--version` | Displays version information and copyright details.                                          | `atrm --version`   |
| `-q queue`  | Restricts removal operations to jobs belonging to a specific queue.                          | `atrm -q b 19`     |
| `-a`        | Removes all jobs owned by the current user from the queue in a single batch.                 | `atrm -a`          |
| `-d`        | Debug mode, printing internal unlinking steps.                                               | `atrm -d 20`       |

## Examples

```bash
atrm 14
```

> This deletes the pending deferred job with ID number `14` from the `at` queue, removing its associated spool file from the system.

```bash
atrm 15 16 17
```

> This removes multiple pending jobs simultaneously by passing several distinct job identification numbers as arguments in a single invocation.

```bash
sudo atrm 22
```

> This executes `atrm` with superuser privileges, allowing an administrator to cancel a pending job owned by another user account.

```bash
atrm -v 19
```

> This removes job number `19` while running in verbose mode (`-v`), printing an explicit confirmation message to standard output upon successful unlinking.

```bash
atq | awk 'NR>1 {print $1}' | xargs atrm
```

> This pipes all job IDs retrieved from `atq` into `xargs` to batch-delete every pending job currently sitting in your personal `at` queue.

## Real-World Scenarios

**Canceling Erroneously Scheduled Maintenance Scripts**

```bash
atq && atrm 24
```

> System administrators inspecting the queue via `atq` discover a misconfigured backup job scheduled for the wrong time; they immediately cancel it using `atrm 24` to prevent operational disruption.

**Clearing Stale Test Jobs After Staging Deployments**

```bash
atrm -a
```

> QA engineers finishing a round of automated staging tests use `atrm -a` to purge all pending test tasks they previously queued in the system.

**Emergency Administrative Interventions**

```bash
sudo atrm 45
```

> Lead system administrators cancel runaway or misbehaving background tasks queued by junior staff members to protect server resources and maintain uptime stability.

## When should it NOT be used?

- **Terminative cancellation of jobs that are _already currently executing_:** **Reason:** `atrm` only removes _pending_ jobs from the future queue; once `atd` forks and begins executing a job, `atrm` cannot stop it. **Use instead:** `kill` command using the running process ID.
- **Deleting periodic cron jobs or systemd timers:** **Reason:** `atrm` is restricted strictly to the `at` queue spool; it cannot modify crontabs or systemd units. **Use instead:** `crontab -e` or `systemctl disable`.

## Alternatives

- **`at -d`:** An alias flag provided by the `at` utility. **Tradeoff:** `at -d` performs the exact same deletion function as `atrm`, but `atrm` is the standard dedicated command utility designed for queue removal.
- **Manual Spool Deletion:** Manually unlinking files in `/var/spool/cron/atjobs/`. **Tradeoff:** Manual file deletion requires root privileges and risks corrupting queue indexes, whereas `atrm` handles permission checks and file locking safely.

## How it works internally

`atrm` operates by directly manipulating files stored inside the system's `at` spool directory (`/var/spool/cron/atjobs/`).

When invoked with job ID arguments (e.g., `atrm 15`), the utility resolves the numeric ID to the corresponding spool filename using the internal hashing/naming convention. It verifies user authorization: standard users can only unlink files matching their own User ID (UID), whereas the root user can unlink any job file.

Once authorization is confirmed, `atrm` issues a standard Unix `unlink()` system call to remove the job file from the filesystem. The `atd` daemon, upon its next polling cycle, will find the spool file gone and ignore it. The command exits with `0` upon successful removal, or returns non-zero if the job ID does not exist or permissions are denied.

## Performance Notes

- `atrm` executes instantaneously because it performs a direct filesystem unlinking operation on small text-based spool files.
- Batch-deleting large sets of jobs using command piping introduces minimal I/O overhead proportional to the number of target files unlinked.

## Security Notes

- **User Ownership Boundaries:** Standard users are strictly blocked from deleting other users' jobs unless operating with root privileges via `sudo`, protecting against malicious queue sabotage in multi-tenant environments.
- **Spool File Integrity:** Unauthorized direct manipulation of the `/var/spool/cron/atjobs/` directory bypasses security checks; `atrm` ensures safe, auditable removal.

## Common Mistakes

- **Attempting to stop a currently running job with `atrm`:** Running `atrm` on a job that has already begun execution. **Why it's wrong:** `atrm` only removes unexecuted jobs from the queue. Once execution starts, you must kill the active process using `kill`.
- **Confusing job numbers with process IDs (PIDs):** Passing a system PID instead of an `at` queue job number to `atrm`. **Why it's wrong:** The command will fail because it looks for spool files matching the deferred job ID index, not running process tables.

## Best Practices

- Always run `atq` first to verify the correct job identification number before executing `atrm` to avoid accidentally deleting critical tasks.
- Use the verbose flag (`-v`) in scripts to ensure your automation logic successfully confirms job removal.

## Interview Questions

- _Query:_ What happens if you run `atrm` on a job ID that has already started executing via the `atd` daemon?
  - _A:_ `atrm` fails to stop the task because it only unlinks _pending_ future jobs from the spool queue. Once `atd` forks and initiates execution, the task becomes an active system process, requiring standard process termination tools like `kill`.
- _Query:_ How does `atrm` verify that a user has authorization to delete a specific queued job?
  - _A:_ `atrm` inspects the ownership permissions of the job's corresponding file in the system spool directory. Standard users can only unlink files matching their own UID, while root can delete any job.
- _Query:_ What is the function of the `-a` flag when passed to `atrm`?
  - _A:_ The `-a` flag instructs `atrm` to automatically remove all pending jobs owned by the currently executing user from the queue in a single batch operation.

## Practice Problems

- _Problem:_ Delete a pending deferred job with ID number `18` from the `at` queue.
  - _Hint:_ Pass the numeric job ID directly to the deletion utility.
  - _Solution:_ `atrm 18` (This unlinks and destroys the spool file corresponding to job ID 18).
- _Problem:_ Remove job number `25` while running in verbose mode to print explicit confirmation of the deletion.
  - _Hint:_ Combine the verbose flag with the job ID argument.
  - _Solution:_ `atrm -v 25` (The `-v` flag forces the command to report successful job removal to standard output).

## References

- - [Man Page for atrm (Linux)](https://man7.org/linux/man-pages/man1/atrm.1.html)
- - [GNU/Linux At Utilities Documentation](https://www.gnu.org/software/inetutils/)
