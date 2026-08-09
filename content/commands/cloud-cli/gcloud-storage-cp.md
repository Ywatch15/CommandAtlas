---
slug: gcloud-storage-cp
name: gcloud storage cp
aliases: []
category: cloud-cli
tags: [gcloud, cloud, google-cloud, storage, gcs, copy, transfer]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'copy file to google cloud storage'
  - 'upload file to gcs bucket'
  - 'download file from gcs'
  - 'transfer files between gcs buckets'
  - 'copy directory to cloud storage cli'
relatedCommands: [gcloud-storage-ls]
alternatives: []
status: draft
---

## What is it?

`gcloud storage cp` is a high-performance command-line utility within the Google Cloud CLI used to copy files and objects between local filesystems and Google Cloud Storage (GCS) buckets, as well as between separate GCS locations. It serves as the modern replacement for legacy `gsutil cp` tools, providing robust parallel transfer capabilities and direct JSON API integrations.

## Why does it exist?

Moving data into and out of cloud storage at scale requires handling chunking, retries, parallel worker threads, and cryptographic hashing efficiently. Legacy tools relied on older XML APIs and Python overhead. `gcloud storage cp` exists to bridge this operational gap by leveraging the optimized GCS JSON API, providing a secure, high-throughput mechanism to copy single files, directories, or massive multi-gigabyte datasets without writing custom transfer scripts.

## Syntax

```bash
gcloud storage cp [-r | -R] [--preserve-acl] [--gzip-in-flight] [--no-clobber] [--storage-class=<CLASS>] <source> ... <destination>
```

## Flags

| Flag                                    | Description                                                                                       | Example                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--recursive`, `-r`, `-R`               | Copies directories, buckets, or bucket subfolders recursively.                                    | `gcloud storage cp -r ./local_dir gs://my-bucket/backup/`                             |
| `--preserve-acl`                        | Preserves object access control lists (ACLs) during copy operations.                              | `gcloud storage cp --preserve-acl ./file.txt gs://my-bucket/`                         |
| `--gzip-in-flight`                      | Automatically compresses files during upload and sets the content-encoding header to gzip.        | `gcloud storage cp --gzip-in-flight ./app.log gs://my-bucket/logs/`                   |
| `--no-clobber`, `-n`                    | Prevents overwriting existing destination files if a file with the same name already exists.      | `gcloud storage cp -n ./data.csv gs://my-bucket/data/`                                |
| `--continue-on-error`                   | Continues batch copy operations even if individual file transfers encounter errors.               | `gcloud storage cp --continue-on-error -r ./dir/ gs://my-bucket/`                     |
| `--storage-class=<CLASS>`               | Sets the storage class for uploaded objects (`STANDARD`, `NEARLINE`, `COLDLINE`, `ARCHIVE`).      | `gcloud storage cp ./archive.zip gs://my-bucket/ --storage-class=ARCHIVE`             |
| `--project=<PROJECT>`                   | Explicitly overrides the default active GCP project ID for billing and request scope.             | `gcloud storage cp ./file.txt gs://bucket/ --project=my-prod-project`                 |
| `--dry-run`                             | Simulates the copy operation, printing what would be transferred without executing data movement. | `gcloud storage cp --dry-run ./large.iso gs://my-bucket/`                             |
| `--customer-supplied-encryption-key`    | Specifies a customer-managed encryption key file for secure decryption or encryption.             | `gcloud storage cp --customer-supplied-encryption-key=key.json file.txt gs://bucket/` |
| `--parallel-composite-upload-threshold` | Configures the size threshold for executing parallel composite uploads on large files.            | `gcloud storage cp --parallel-composite-upload-threshold=150M big.iso gs://bucket/`   |
| `--verbosity=<LEVEL>`                   | Sets logging verbosity level for debugging network transactions (`debug`, `info`, `warning`).     | `gcloud storage cp ./file.txt gs://bucket/ --verbosity=debug`                         |

## Examples

```bash
gcloud storage cp ./local_report.pdf gs://my-company-bucket/reports/report.pdf
```

> This uploads a single local file (`local_report.pdf`) into the specified GCS bucket under the target object key `reports/report.pdf`, authenticating automatically via your active gcloud session.

```bash
gcloud storage cp gs://my-company-bucket/exports/data.csv ./downloaded_data.csv
```

> This downloads an object from Google Cloud Storage to your local filesystem, preserving the original file data and metadata.

```bash
gcloud storage cp -r ./dist/ gs://my-web-bucket/
```

> This recursively copies an entire local directory (`./dist/`) and all its nested subfolders into a GCS bucket, maintaining the original directory structure in the cloud namespace.

```bash
gcloud storage cp ./database.sql.gz gs://backup-bucket/ --storage-class=ARCHIVE
```

> This uploads a compressed database backup directly into the cost-effective `ARCHIVE` storage class for long-term compliance retention.

```bash
gcloud storage cp --gzip-in-flight ./app.log gs://log-bucket/logs/
```

> This compresses the local log file in-flight during the network upload, automatically applying gzip content-encoding headers so that storage size and bandwidth consumption are minimized.

## Real-World Scenarios

**Migrating Local Database Backups to Cloud Storage**

```bash
gcloud storage cp /var/backups/db_dump.sql.gz gs://enterprise-backup-bucket/sql/ --storage-class=COLDLINE
```

> Systems administrators use scheduled shell scripts incorporating `gcloud storage cp` to push compressed daily database dumps directly into cloud storage containers configured with the cost-optimized `COLDLINE` storage tier for disaster recovery.

**Deploying Static Web Assets to GCS Buckets**

```bash
gcloud storage cp -r ./dist/* gs://my-static-website-bucket/
```

> Frontend web engineers automate continuous integration pipelines by uploading compiled static application bundles and assets directly into Google Cloud Storage buckets configured for website hosting, publishing updates instantly.

**Cross-Region Cloud Backup Replication**

```bash
gcloud storage cp -r gs://primary-us-bucket/archive/ gs://secondary-eu-bucket/archive/
```

> Cloud infrastructure engineers execute cloud-to-cloud copy operations to replicate critical archival data sets across geographic regions for high availability and multi-region disaster recovery compliance.

## When should it NOT be used?

- **Executing massive petabyte-scale multi-terabyte enterprise data migrations:** Using `gcloud storage cp` for exabyte-scale data transfers. **Reason:** While fast, general-purpose CLI copy commands lack advanced distributed agent coordination required for massive migrations. **Use instead:** Storage Transfer Service or Google Cloud Migration Services.
- **Incremental directory synchronization where deleted local files must be mirrored:** **Reason:** `gcloud storage cp` strictly copies files forward; it does not delete destination files that were removed locally. **Use instead:** `gcloud storage rsync`.
- **Running inside ephemeral serverless environments with tight execution timeouts:** **Reason:** Transferring extremely large single files over unstable network connections via a CLI wrapper can exceed function timeout limits. **Use instead:** Pre-signed URLs enabling direct client-side uploads.

## Alternatives

- **`gcloud storage rsync`:** A specialized directory synchronization utility. **Tradeoff:** `gcloud storage rsync` synchronizes contents between two directories (local-to-cloud or cloud-to-cloud) by mirroring deletions and changes, whereas `gcloud storage cp` is strictly an additive copy command.
- **`gsutil cp`:** The legacy Python-based transfer command. **Tradeoff:** `gsutil cp` relies on older XML APIs and Python runtimes, making it significantly slower and less optimized than the modern Go-backed `gcloud storage cp` utility.

## How it works internally

When you execute `gcloud storage cp`, the Google Cloud CLI validates your source paths, resolves your active authentication tokens, and translates the command into optimized JSON API requests targeting Google Cloud Storage endpoints (`storage.googleapis.com`).

Under the hood, the transfer engine evaluates file sizes and determines whether to execute a standard single-shot upload/download or a multi-part upload. For large files exceeding specific thresholds, it utilizes **parallel composite uploads**, slicing the file into independent chunks, uploading them concurrently across multiple worker threads, and issuing a final compose request to assemble the parts in GCS. Throughout transmission, cryptographic hashes (MD5 and CRC32C) are calculated and verified against GCS object metadata to guarantee data integrity. The command returns an exit code of `0` upon successful transfer completion, or non-zero if network failures or permission rejections occur.

## Performance Notes

- `gcloud storage cp` utilizes multi-threaded concurrency automatically, allowing the transfer engine to push or pull multiple file blocks simultaneously across separate network connections, drastically increasing throughput over high-latency links.
- When uploading massive single files (e.g., multi-gigabyte ISOs), leveraging parallel composite uploads prevents single-stream bottlenecking and accelerates transfer speeds by utilizing multiple worker streams.

## Security Notes

- **IAM Least Privilege Enforcement:** The executing Google Cloud principal must possess explicit permissions—such as `storage.objects.create` for uploads and `storage.objects.get` for downloads—on the target GCS bucket. Overly permissive roles risk unauthorized data access.
- **Transport Layer Encryption:** All data transfers executed via `gcloud storage cp` occur strictly over encrypted HTTPS channels, protecting sensitive payloads from man-in-the-middle interception during transit.

## Common Mistakes

- **Omitting the recursive flag when copying directories:** Running `gcloud storage cp ./my_folder gs://my-bucket/` without `-r`. **Why it's wrong:** GCS treats directories as virtual prefixes; failing to provide the recursive flag causes the command to fail or skip nested files.
- **Forgetting the `gs://` protocol prefix on cloud destinations:** Running `gcloud storage cp ./file.txt my-bucket/file.txt`. **Why it's wrong:** Omitting the `gs://` scheme causes the CLI to interpret the cloud destination as a local filesystem directory, resulting in local file copy errors.
- **Assuming `cp` mirrors deletions:** Expecting `gcloud storage cp` to delete files in the cloud that were deleted locally. **Why it's wrong:** `gcloud storage cp` is strictly additive. Use `gcloud storage rsync` if you need bi-directional or mirror synchronization.

## Best Practices

- Always include the recursive flag (`-r`) when transferring directory trees or folder structures to ensure all nested files and sub-prefixes are copied correctly.
- When uploading large binary files or archives, rely on default parallel composite thresholds to maximize network throughput via concurrent worker threads.
- In automated deployment scripts, explicitly define storage classes (`--storage-class=ARCHIVE` or `COLDLINE`) for backup assets to prevent long-term cost overruns.

## Interview Questions

- **Q:** How does `gcloud storage cp` achieve high-throughput data transfer for massive files compared to traditional single-stream copy utilities?
  - **A:** `gcloud storage cp` utilizes parallel composite uploads and multi-threaded concurrency. Instead of streaming a massive file through a single TCP connection, it slices the file into discrete chunks, uploads them concurrently across multiple parallel worker threads, and instructs GCS to compose the chunks into a final object, maximizing bandwidth utilization.
- **Q:** What is the operational distinction between `gcloud storage cp` and `gcloud storage rsync` regarding directory synchronization?
  - **A:** `gcloud storage cp` is an additive copy command that transfers specified source files or directories to a destination, leaving unmanaged or previously existing files untouched. `gcloud storage rsync` evaluates source and destination states, copying new or modified files while optionally mirroring deletions so that the destination precisely matches the source tree.
- **Q:** Why is cryptographic hash verification (such as CRC32C) critical during `gcloud storage cp` execution?
  - **A:** During transit across public or enterprise networks, data packets can occasionally experience bit rot, corruption, or network packet loss. Cryptographic hashes calculated locally and verified against GCS object metadata ensure absolute data integrity, confirming that the uploaded or downloaded file is an exact byte-for-byte match.

## Practice Problems

- _Problem:_ Recursively copy a local directory `./build_output/` to a GCS bucket destination `gs://releases-bucket/v2/`.
  - _Hint:_ Combine the recursive flag with the local source path and cloud destination URI.
  - _Solution:_ `gcloud storage cp -r ./build_output/ gs://releases-bucket/v2/` (The `-r` flag ensures all nested files and subfolders within the build directory are copied recursively to the cloud target).
- _Problem:_ Upload a local database backup file `production.sql` to `gs://backup-bucket/` while assigning it to the `COLDLINE` storage class.
  - _Hint:_ Combine the local file path, cloud destination, and storage class flag.
  - _Solution:_ `gcloud storage cp ./production.sql gs://backup-bucket/ --storage-class=COLDLINE` (This uploads the file and applies the specified cost-optimized storage tier).

## References

- - [Google Cloud CLI Documentation - gcloud storage cp](https://cloud.google.com/sdk/gcloud/reference/storage/cp)
- - [Google Cloud Storage Documentation - Copying Objects](https://cloud.google.com/storage/docs/uploading-and-downloading)
