---
slug: locate
name: locate
aliases: [mlocate, plocate]
category: file-systems
tags: [linux, search, file-management, database, optimization]
difficulty: beginner
supportedOS: [linux, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'find file quickly'
  - 'search file by name fast'
  - 'find path of file linux'
  - 'search entire filesystem'
  - 'update locate database'
relatedCommands: [find, grep]
alternatives: [find]
status: draft
---

## What is it?

`locate` is an ultra-fast file searching utility that queries a pre-built, local indexing database to find paths matching a specific string or regular expression. Unlike traditional search tools that physically crawl the hard drive sector-by-sector in real-time, `locate` parses an optimized binary map of the file system, delivering nearly instantaneous global search results at the cost of slight data staleness.

## Why does it exist?

Finding a deeply nested configuration file like `php.ini` using the `find / -name "php.ini"` command causes a severe performance penalty. The kernel must parse every single directory inode across the entire storage hierarchy, consuming high I/O bandwidth and taking minutes on large filesystems. `locate` exists to solve this search latency. By relying on a background daemon (`updatedb`) to build an indexed map of the filesystem during off-peak hours (usually via a nightly cron job), `locate` provides a heavily optimized, read-only query engine that resolves global searches in milliseconds.

## Syntax

```bash
locate [OPTION]... PATTERN...
```

## Flags

| Flag                      | Description                                                                                                                                                      | Example                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `-i`, `--ignore-case`     | Ignores capitalization distinctions in both the search pattern and the indexed file names.                                                                       | `locate -i "readme.md"`      |
| `-c`, `--count`           | Suppresses standard output. Instead, prints only the total number of files that matched the search pattern.                                                      | `locate -c ".mp4"`           |
| `-b`, `--basename`        | Restricts the search specifically to the file's final basename, ignoring any matches that occur higher up in the directory path string.                          | `locate -b "\.bashrc"`       |
| `-w`, `--wholename`       | The default behavior. Matches the search pattern against the entire absolute path string, not just the file name.                                                | `locate -w "nginx/conf"`     |
| `-e`, `--existing`        | Filters the results. Double-checks the physical filesystem to ensure the matched file currently exists before printing it, filtering out recently deleted files. | `locate -e "temp.dat"`       |
| `-r`, `--regexp <REGEXP>` | Interprets the pattern as a complex POSIX basic regular expression instead of a simple string match.                                                             | `locate -r "^/var/.*\.log$"` |
| `-S`, `--statistics`      | Outputs technical metadata about the `locate` database itself, including the total number of indexed directories, files, and bytes.                              | `locate -S`                  |
| `-d`, `--database <path>` | Queries a custom database file instead of the system default (typically `/var/lib/mlocate/mlocate.db`).                                                          | `locate -d ~/mydb.db "data"` |
| `-l`, `--limit <N>`       | Restricts the output to display a maximum of _N_ matches, preventing terminal flooding on extremely broad queries.                                               | `locate -l 5 ".conf"`        |

## Examples

```bash
locate nginx.conf
```

> The standard invocation. It scans the database for any absolute path string containing "nginx.conf" (e.g., `/etc/nginx/nginx.conf`, `/usr/local/nginx/conf/nginx.conf.default`) and outputs them in milliseconds.

```bash
locate -i "*error*log"
```

> Performs a case-insensitive search utilizing shell globbing. It matches paths containing variations like `Error.log`, `ERROR_LOG`, or `nginx-error.log` anywhere on the indexed system.

```bash
locate -b "\.env"
```

> Enforces a strict basename search. By combining the `-b` flag with the backslash escape sequence (preventing the shell from expanding the dot), it ensures `locate` only returns actual files named `.env`, completely ignoring files that merely reside inside a directory named `.env/`.

```bash
locate -e "my_script.sh"
```

> Mitigates database staleness. If `my_script.sh` was deleted 3 hours ago, the `locate` database still thinks it exists. By passing `-e`, the command queries the database, retrieves the path, and then seamlessly performs an `lstat()` system call to verify the physical file is still present on disk before outputting the path to the terminal.

```bash
sudo updatedb
```

> The mandatory companion command. It is not part of the `locate` syntax, but forces the system to manually rebuild the search database immediately, ensuring that any files created within the last few minutes are indexed and available for `locate` to find.

## Real-World Scenarios

**Instant Environment Reconnaissance**

```bash
locate -r "bin/python[2-3]\.[0-9]$"
```

> When deploying applications on a completely foreign server, developers need to know exactly which versions of Python are installed without waiting for global disk crawls. Using `locate` with a regular expression instantly dumps every executable path matching Python 2.x or 3.x residing in any `bin/` directory across the entire filesystem.

**Identifying Rogue Data Consumption**

```bash
locate -c ".iso"
```

> A system administrator suspects that a user is downloading massive disc images to hidden directories, exhausting disk space. By running `locate -c`, they instantly receive a count of every `.iso` file on the system. If the count is unusually high, they drop the `-c` flag to dump the exact paths.

## When should it NOT be used?

- **Searching for recently created files:** **Do not rely on `locate` for real-time tracking.** If a script generated a log file 10 minutes ago, `locate` will not find it because the database (updated nightly) is completely blind to it. Use `find` for live querying.
- **Security auditing of unindexed paths:** **Do not assume `locate` sees everything.** For security reasons, the `updatedb` daemon is configured (via `/etc/updatedb.conf`) to intentionally skip sensitive or volatile directories like `/tmp`, `/sys`, `/proc`, and often mounted external network drives (`/mnt`). If malware is hiding in `/tmp`, `locate` will never return it.

## Alternatives

- **`find`:** **Best for accurate, live queries.** Crawls the actual physical disk. Slower, but 100% accurate to the millisecond and highly capable of executing boolean expressions on file metadata (size, time, ownership).
- **`fd`:** **Best for fast, live developer searches.** An ultra-fast, multithreaded alternative to `find`. It crawls the physical disk but ignores `.git` and hidden directories by default, making it nearly as fast as `locate` for standard development workspaces.
- **`fzf` (Fuzzy Finder):** **Best for interactive terminal filtering.** Can be piped with `find` to provide an interactive, visual fuzzy-search interface over file paths.

## How it works internally

`locate` does not interact with the physical hard drive partitions. It exclusively parses a highly compressed binary file, historically located at `/var/lib/mlocate/mlocate.db` (or `plocate.db` on modern systems).

This database is constructed by the `updatedb` utility. Typically, a systemd timer or cron job (e.g., `/etc/cron.daily/mlocate`) triggers `updatedb` once a day as the `root` user. `updatedb` executes a complete `find /` sweep of the filesystem. To save space, it does not store raw strings. It uses front-compression (delta encoding): if a directory contains `/usr/bin/python` and `/usr/bin/perl`, it stores `/usr/bin/` once, and only stores the divergent string data (`python`, `perl`) for subsequent entries.

Modern implementations of the tool (like `plocate`, the default on newer Ubuntu/Debian releases) go further. `plocate` builds an inverted index over trigrams (3-character chunks) of the file paths. When you execute `locate log`, it instantly intersects the index for paths containing `log`, returning matches in microseconds regardless of database size, without needing to linearly scan the compressed tree.

## Performance Notes

- **I/O Zero, CPU Bound:** Executing `locate` generates effectively zero disk I/O, as the database file is small enough to be cached entirely in system RAM. The speed is bounded only by the CPU's ability to decompress and string-match the database entries.
- **The Cost of `updatedb`:** The speed of `locate` comes at the cost of the `updatedb` background daemon. Running `updatedb` performs millions of random I/O operations. On old, heavily fragmented HDD systems, the nightly `updatedb` cron job can severely impact server performance for several minutes while it crawls.

## Security Notes

- **Visibility Control (mlocate):** Early versions of `locate` posed a severe security risk, as any user could query the database to discover the exact paths of private files residing in other users' home directories. Modern implementations (`mlocate` and `plocate`) integrate with the kernel's access control. When a non-root user executes `locate`, the tool checks the permissions of the parent directories in the database. If the user does not physically possess `read` (`+r`) and `execute` (`+x`) permissions to navigate to that folder on the real filesystem, `locate` securely filters the path out of the terminal output.

## Common Mistakes

- **Expecting `locate` to find new files**
  - _Mistake:_ Running `touch important.txt` and immediately running `locate important.txt`, wondering why the output is blank.
  - _Why:_ The file is not in the database. You must either use `find` or execute `sudo updatedb` to force an immediate re-indexing of the filesystem before running `locate`.
- **Confusing exact matches with substring matches**
  - _Mistake:_ Using `locate ssh` and being overwhelmed by thousands of results including `ssh-agent`, `sshd_config`, and `libssh2.so`.
  - _Why:_ By default, `locate` matches substrings anywhere in the absolute path. If you only want exact file names, you must use the basename flag and an explicit anchor regex, or switch to `find`.
- **Trusting stale databases for cleanup scripts**
  - _Mistake:_ Using `locate *.tmp | xargs rm` in a script.
  - _Why:_ If the `.tmp` file was already deleted by another process 2 hours ago, the path is still passed to `rm`, generating hundreds of "No such file or directory" errors. Always pass the `-e` (existing) flag when scripting to force real-time verification.

## Best Practices

- **Configure Exclusion Rules:** Review your `/etc/updatedb.conf` file. Ensure that `PRUNEPATHS` explicitly lists massive, unsearchable directories (like `/var/lib/docker/overlay2`, `/mnt/backups`, or `/var/spool`) to keep your `locate` database compact and prevent `updatedb` from destroying disk I/O every night.
- **Combine with `grep` for Precision:** Instead of wrestling with `locate`'s basic regex parser, pipeline the output through grep: `locate .conf | grep "nginx"` provides faster, more familiar filtering.

## Interview Questions

**Q: You run `locate secret_key.pem`. The command returns nothing. However, when you run `sudo find / -name "secret_key.pem"`, it successfully finds the file in `/root/.ssh/`. Assuming the `updatedb` cron job ran successfully last night, why didn't `locate` find the file?**
**A:** Modern `locate` implementations (`mlocate`/`plocate`) are security-aware. When you run `locate` as a standard user, it evaluates directory permissions before returning a result. Because a standard user lacks read/execute permissions to traverse into the `/root/` directory, `locate` intentionally suppresses the file from the output to prevent unauthorized reconnaissance.

**Q: A developer frequently complains that the `locate` command on a development server is slow and causing CPU spikes. You investigate and realize the server utilizes a massive, 100TB NFS mount filled with millions of media files. How do you permanently fix this?**
**A:** The performance issue is caused by the nightly `updatedb` crawler attempting to index the massive NFS mount over the network, bringing the system to a halt. To fix this, you must edit the `/etc/updatedb.conf` file and add the NFS mount's path (e.g., `/mnt/nfs_media`) to the `PRUNEPATHS` variable, or add `nfs` to the `PRUNEFS` (Prune File Systems) variable, instructing the crawler to ignore it entirely.

## Practice Problems

**Problem:** You need to find a configuration file. You remember the word "apache" is in the name, but you aren't sure if it was capitalized (e.g., Apache.conf, apache2.conf). You only want the command to return the paths if the files actually physically exist on the disk right now.
**Hint:** Combine the case-insensitive flag with the existence-check flag.
**Solution:**

```bash
locate -i -e "apache"
```

**Problem:** You are searching for the exact command line utility `docker`. If you type `locate docker`, it returns hundreds of log paths and cache directories. Write the command to restrict the search exclusively to files whose actual, final filename contains "docker", ignoring matches found in parent folder names.
**Hint:** Use the flag that restricts searches to the basename.
**Solution:**

```bash
locate -b "docker"
```

## References

- [locate(1) - Linux man page](https://linux.die.net/man/1/locate)
- [updatedb.conf(5) - Configuration file for updatedb](https://linux.die.net/man/5/updatedb.conf)
