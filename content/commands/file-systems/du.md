---
slug: du
name: du
aliases: [disk usage]
category: file-systems
tags: [linux, storage, disk-space, auditing, files]
difficulty: beginner
supportedOS: [linux, macos, unix]
supportedShells: [bash, zsh, sh]
intentPhrases:
  - 'find largest directories'
  - 'calculate folder size'
  - 'estimate file space usage'
  - 'check directory size linux'
  - 'find what is taking up disk space'
relatedCommands: [df, ls, find]
alternatives: [tree]
status: draft
---

## What is it?

`du` (disk usage) is a standard POSIX utility used to estimate file space usage. Unlike `df` which queries global partition metadata, `du` performs a recursive crawl through a specified directory tree, interrogating the filesystem to calculate the total physical block space consumed by individual files and accumulating those totals upward into their parent directories.

## Why does it exist?

When a partition inevitably reaches 100% capacity, administrators need to know exactly _what_ is consuming the space. The `df` command cannot identify problematic files, and the `ls -l` command only shows the size of a directory's metadata file, not the sum of its contents. `du` exists to bridge this gap. By recursively aggregating file sizes, it provides a mathematical breakdown of storage consumption, allowing engineers to pinpoint massive log files, abandoned database dumps, or bloated `node_modules` folders for targeted garbage collection.

## Syntax

```bash
du [OPTION]... [FILE]...
```

## Flags

| Flag                        | Description                                                                                                                                                | Example                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `-h`, `--human-readable`    | Prints sizes in human-readable formats (e.g., 1K, 234M, 2G) instead of raw 1K block counts.                                                                | `du -h /var/log`                   |
| `-s`, `--summarize`         | Displays only a single grand total for the specified argument, suppressing the output of all internal subdirectories.                                      | `du -sh /opt/app`                  |
| `-c`, `--total`             | Produces a grand total line at the very end of the output after listing all individual arguments.                                                          | `du -hc dir1/ dir2/`               |
| `-d <N>`, `--max-depth=<N>` | Restricts the output to a maximum directory depth of `N`. (e.g., `-d 1` only shows the immediate subdirectories).                                          | `du -hd 1 /var`                    |
| `-a`, `--all`               | Modifies the output to print the sizes of all individual _files_ along with directories. By default, `du` only prints directories.                         | `du -ah /etc`                      |
| `-x`, `--one-file-system`   | Restricts the recursive crawl strictly to the filesystem where the argument resides, ignoring mounted external drives or `/proc`.                          | `du -xh /`                         |
| `--exclude=<pattern>`       | Prevents files or directories matching the shell pattern from being counted in the total sum.                                                              | `du -sh --exclude="*.mp4" ./media` |
| `--apparent-size`           | Prints apparent sizes rather than physical disk usage. (e.g., a 100GB sparse file might only consume 1MB physically, but `--apparent-size` reports 100GB). | `du -h --apparent-size file.img`   |

## Examples

```bash
du -sh /var/log
```

> The most frequently used pattern. Calculates the size of the entire `/var/log` directory and uses `-s` (summarize) to output a single, clean line like `2.4G    /var/log`, formatted nicely with `-h` (human-readable).

```bash
du -hd 1 /var
```

> The primary troubleshooting query. Navigates into `/var` and prints the summarized size of every immediate subdirectory (depth 1) inside it. Administrators use this to rapidly isolate whether `/var/log`, `/var/lib`, or `/var/cache` is the culprit behind disk exhaustion.

```bash
du -ah . | sort -hr | head -n 10
```

> An incredibly powerful pipeline for locating massive files. `du` outputs the size of every file and folder (`-a`) in the current directory. `sort -hr` parses the human-readable suffixes (K, M, G) and sorts them descending. `head` restricts the terminal output to the top 10 largest items.

```bash
du -shc /home/alice /home/bob /home/charlie
```

> Checks the sizes of three specific home directories, outputting their individual sizes, and appends a final `total` line (`-c`) summing all three arguments together.

```bash
du -xh -d 1 /
```

> Safely calculates space usage at the root partition. The `-x` (one-file-system) flag is absolutely critical here. It prevents `du` from crawling across into heavy external NFS mounts (`/mnt/san`) or freezing indefinitely while trying to read dynamic kernel structures in `/proc`.

## Real-World Scenarios

**Auditing Docker Overlay Storage**

```bash
sudo du -sh /var/lib/docker/overlay2/* | sort -hr | head -n 5
```

> When the Docker storage directory bloats out of control, standard `docker system prune` sometimes misses orphaned container layers. System administrators execute this command as `root` to pinpoint the specific heavily-mutated container layers physically consuming the most blocks on the storage driver.

**Finding Cache Bloat in Development Projects**

```bash
du -sh --exclude="node_modules" --exclude=".git" ~/projects/webapp
```

> Developers often need to know the true size of their application code. Because `node_modules` and `.git` histories can inflate a 5MB project into a 1GB folder, using `--exclude` allows them to calculate the true source code footprint before packaging it into a tarball.

## When should it NOT be used?

- **Checking overall disk capacity:** **Do not use `du` to check how much free space you have.** `du` only totals the files it is asked to crawl. It takes minutes to run on root (`/`) and will not account for filesystem journaling overhead. Use `df -h` for instantaneous, system-wide disk capacity metrics.
- **Counting millions of tiny files:** Crawling a directory like `/var/spool` containing 10 million temporary cache files using `du` causes extreme random disk I/O (thrashing) as it calls `stat()` on every single file. This can lock up I/O-sensitive production servers.
- **Understanding fragmented disk images:** **Avoid using `du` on VM images or torrent downloads without understanding sparse files.** By default, `du` reports physical blocks used. A 100GB VM disk image containing nothing might report as `4K`. If you need the logical file size, you must explicitly use `ls -l` or `du --apparent-size`.

## Alternatives

- **`ncdu` (NCurses Disk Usage):** **Best for interactive troubleshooting.** Scans the directory exactly like `du` but presents an interactive graphical UI in the terminal. You can use arrow keys to navigate deep into large folders and press `d` to delete them on the fly.
- **`find . -size +1G`:** **Best for finding specific massive files.** If you only care about files larger than 1GB, `find` locates them without needing to sum up all the small files mathematically, bypassing unnecessary arithmetic.
- **`df`:** **Best for partition-level metrics.**

## How it works internally

When you execute `du /path`, the utility begins a recursive, depth-first tree traversal of the directory structure.

For every file, directory, and symbolic link it encounters, it issues an `lstat()` or `fstatat()` system call. These calls query the kernel for the object's inode metadata. Specifically, `du` reads the `st_blocks` attribute from the inode, which reports the actual number of 512-byte sectors allocated to the file on the physical hard drive. It multiplies this by 512 to get the byte usage, rounding up to the nearest filesystem block size (usually 4KB).

As it crawls back up the tree, it continually adds the sizes of the child nodes to their parent directory's running total.

_Hard Link Optimization:_ If `du` simply added up every file, it would drastically over-count files that share the same data via hard links. To prevent this, `du` maintains an internal hash table of the Device IDs and Inode numbers it has already seen. If it encounters a hard link to an inode it has already counted, it ignores the file, ensuring the mathematical total accurately reflects the true physical disk consumption.

## Performance Notes

- **Metadata Caching:** Running `du -sh /` will take significantly longer on the first execution than on the second. The first run forces the hard drive to seek and read millions of inodes. The Linux kernel caches this metadata in RAM (the dentry/inode cache). The second execution reads from RAM and finishes almost instantly.
- **The Cost of Deep Crawls:** `du` is single-threaded. On networked file systems (NFS, SMB) with high latency, issuing millions of sequential `lstat()` calls over the network makes `du` cripplingly slow.

## Security Notes

- **Permission Denied Errors:** `du` runs within the execution context of the user invoking it. If a user runs `du -sh /var`, it will throw hundreds of "Permission denied" errors for directories like `/var/log/audit` and will _not_ include their sizes in the total sum, resulting in wildly inaccurate totals. To get a true total of system directories, `du` must be run as `root` (via `sudo`).

## Common Mistakes

- **Confusing Apparent Size with Disk Usage**
  - _Mistake:_ Using `ls -lh` and seeing a file is 5GB, but running `du -sh` on the file and seeing it only consumes 200MB.
  - _Why:_ The file is sparse. It was created to logically hold 5GB of data, but it only contains 200MB of actual written bytes, and the rest is unwritten zero-space. `ls` shows the logical size, `du` shows the physical blocks allocated on the hard drive. Use `du --apparent-size` to match `ls`.
- **Forgetting `--max-depth`**
  - _Mistake:_ Running `du -h /usr` without `-s` or `-d 1`.
  - _Why:_ `du` will print a line for _every single subdirectory_ inside `/usr`, flooding the terminal with tens of thousands of lines of output before finally reaching the total at the bottom.
- **Crawling Mount Points**
  - _Mistake:_ Running `du -sh /*` to find out what is filling up the root (`/`) partition, and the command hangs for hours.
  - _Why:_ The wildcard `*` expands to include directories like `/mnt/nfs_backup_server` and `/proc`. `du` attempts to calculate the size of a 50TB remote NAS array. Always use `-x` (one-file-system) to prevent traversing mount boundaries.

## Best Practices

- **Combine with `sort` and `head`:** `du` is rarely useful as a standalone wall of text. Memorize the pattern `du -ah -d 1 . | sort -hr | head -n 10` to instantly weaponize it for disk space recovery.
- **Use `-c` for multiple targets:** If passing multiple specific directories (e.g., `du -sh /var/log /var/cache`), always append `-c` to get a clean total summation line at the bottom, saving you from doing mental math.

## Interview Questions

**Q: You have a directory containing three files: `fileA.txt` (10MB), `fileB.txt` (10MB), and `fileC.txt` which is a hard link to `fileA.txt`. If you run `du -sh` on that directory, what total size will it report, and why?**
**A:** It will report ~20MB. `du` maintains an internal hash table of inodes it has already visited during its traversal. When it calculates the size of `fileA.txt`, it records the inode. When it encounters `fileC.txt`, it recognizes the inode has already been accounted for and safely skips it, preventing the double-counting of physical disk space.

**Q: Why does running `du -sh /` often output a much smaller total size than what `df -h /` reports as "Used" for the root partition?**
**A:** `du` calculates size by crawling the visible filesystem tree. It cannot see or count files that have been deleted by a user but are still held open by a running process (zombie files). Additionally, `df` accounts for filesystem metadata structures (like the journal and superblock reservations) which consume disk blocks but do not exist as files in the directory tree for `du` to count.

## Practice Problems

**Problem:** You are running out of space in `/var`. You want to see the human-readable summarized size of every immediate subdirectory inside `/var`, but you do not want the output to drill down recursively into their children. Write the command to achieve this.
**Hint:** Use the flag that restricts the traversal depth.
**Solution:**

```bash
du -h -d 1 /var
```

**Problem:** You have a directory named `project`. You want to calculate the total size of the directory, but you explicitly want to ignore the folder named `node_modules`. Output only a single line with the total summarized size.
**Hint:** Combine the summarize flag, human-readable flag, and the explicit exclusion flag.
**Solution:**

```bash
du -sh --exclude="node_modules" project/
```

## References

- [du(1) - Linux man page (GNU Coreutils)](https://linux.die.net/man/1/du)
- [GNU Coreutils Manual: du invocation](https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html)
