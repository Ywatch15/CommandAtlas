---
slug: aws-s3-sync
name: aws s3 sync
aliases: []
category: cloud-cli
tags: [aws, s3, storage, object-storage, file-transfer, cloud, synchronization]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'sync local folder to s3 bucket'
  - 'mirror directory to aws s3'
  - 'download only new files from s3'
  - 'backup local files to s3'
  - 'synchronize two s3 buckets'
relatedCommands: [aws-s3-cp, aws-s3-ls]
alternatives: [aws-s3-cp]
status: draft
---

## What is it?

`aws s3 sync` is a high-level AWS CLI command that synchronizes directories and S3 prefixes by only transferring missing or updated files. It intelligently compares the size and last-modified timestamp of objects in the source and destination, ensuring that only necessary deltas are uploaded, downloaded, or copied. It abstracts away the heavy lifting of recursive API pagination, object comparison, and multipart transfer orchestration into a single, highly optimized operation.

## Why does it exist?

Uploading or mirroring entire directories using standard copy commands (like `aws s3 cp --recursive`) is highly inefficient, wasting massive amounts of bandwidth and incurring unnecessary API costs by re-uploading identical files. System administrators and DevOps engineers needed a cloud-native equivalent to the POSIX `rsync` tool to handle incremental backups and deployments. `aws s3 sync` exists to fulfill this gap, providing a state-aware synchronization engine that minimizes data transfer while cleanly navigating AWS-specific complexities like credential signing, multipart uploads, and remote object listing.

## Syntax

```bash
aws s3 sync <LocalPath> <S3Uri> [options]
aws s3 sync <S3Uri> <LocalPath> [options]
aws s3 sync <S3Uri> <S3Uri> [options]
```

## Flags

| Flag                 | Description                                                                                                                                 | Example                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `--delete`           | Deletes files in the destination that do not exist in the source, perfectly mirroring the source.                                           | `aws s3 sync ./data s3://bucket/data --delete`                    |
| `--dryrun`           | Simulates the sync operation without transferring or deleting any data. Essential for verifying `--delete` logic.                           | `aws s3 sync ./logs s3://bucket/logs --dryrun`                    |
| `--exclude`          | Excludes files or objects that match the specified pattern. Evaluated sequentially alongside `--include`.                                   | `aws s3 sync . s3://bucket/ --exclude "*.tmp"`                    |
| `--include`          | Includes files or objects that match the specified pattern, overriding previous `--exclude` rules.                                          | `aws s3 sync . s3://bucket/ --exclude "*" --include "*.txt"`      |
| `--exact-timestamps` | Forces synchronization only if the source and destination timestamps are _exactly_ different (otherwise, defaults to source being _newer_). | `aws s3 sync s3://b1 s3://b2 --exact-timestamps`                  |
| `--size-only`        | Instructs the diff engine to ignore timestamps entirely and only compare file sizes to determine if a transfer is needed.                   | `aws s3 sync ./build s3://bucket/ --size-only`                    |
| `--storage-class`    | Specifies the S3 storage class for newly uploaded objects (e.g., `STANDARD`, `INTELLIGENT_TIERING`, `GLACIER`).                             | `aws s3 sync ./arch s3://bucket/ --storage-class GLACIER`         |
| `--acl`              | Applies a canned Access Control List (ACL) to the transferred objects, such as `private` or `public-read`.                                  | `aws s3 sync ./assets s3://bucket/ --acl public-read`             |
| `--sse`              | Enables Server-Side Encryption on the destination object. Accepts `AES256` or `aws:kms`.                                                    | `aws s3 sync ./secure s3://bucket/ --sse aws:kms`                 |
| `--metadata`         | Attaches a map of custom HTTP headers or key-value pairs as metadata to the destination objects.                                            | `aws s3 sync ./ . s3://bucket/ --metadata "env=prod"`             |
| `--cache-control`    | Sets the `Cache-Control` HTTP header for the objects, directing how web browsers and CDNs should cache them.                                | `aws s3 sync ./build s3://bucket/ --cache-control "max-age=3600"` |
| `-q`, `--quiet`      | Suppresses standard output, hiding the progress bar and transfer summary. Errors are still printed to stderr.                               | `aws s3 sync ./ s3://bucket/ -q`                                  |

## Examples

```bash
aws s3 sync ./backups s3://my-company-backups/db/
```

> Performs a basic incremental upload. The CLI compares the local `./backups` directory with the remote S3 prefix. It uploads only files that do not exist remotely, or files where the local modified time is newer or the size is different.

```bash
aws s3 sync s3://source-bucket/assets/ ./assets/ --delete
```

> Downloads files from an S3 bucket to a local directory, ensuring the local directory is an exact mirror of the remote. The `--delete` flag removes any local files in `./assets/` that are no longer present in the S3 bucket.

```bash
aws s3 sync ./build s3://website-bucket/ --exclude "*.map" --exclude ".DS_Store"
```

> Syncs a compiled frontend application to an S3 bucket used for static hosting. The `--exclude` flags prevent the upload of source maps and macOS hidden directory files, ensuring clean deployment artifacts and saving bandwidth.

```bash
aws s3 sync s3://us-east-bucket/data s3://eu-west-bucket/data --storage-class STANDARD_IA
```

> Performs a cross-region, cross-bucket synchronization entirely within the AWS backbone network. The destination files are immediately transitioned into the Infrequent Access (`STANDARD_IA`) storage tier to optimize long-term storage costs.

```bash
aws s3 sync ./media s3://cdn-bucket/media --delete --dryrun
```

> Simulates a destructive mirror operation. Because `--delete` is used, administrators run this with `--dryrun` first to output a textual list of exactly which files would be uploaded, downloaded, or permanently deleted from the S3 bucket, preventing catastrophic data loss.

## Real-World Scenarios

**Static Website Deployment**

```bash
aws s3 sync ./build s3://my-spa-bucket/ --delete --cache-control "public, max-age=31536000, immutable" --exclude "index.html"
aws s3 cp ./build/index.html s3://my-spa-bucket/ --cache-control "no-cache"
```

> When deploying a React or Vue SPA, CI/CD pipelines use `aws s3 sync` with `--delete` to upload hashed assets (removing old, unused chunks from the bucket). Aggressive caching headers are applied to the hashed assets, while `aws s3 cp` is run subsequently to apply a strict `no-cache` header specifically to `index.html` so users never see a stale application state.

**Incremental Database Backups**

```bash
aws s3 sync /var/lib/postgresql/backups s3://db-archives/pg/ --storage-class INTELLIGENT_TIERING
```

> Database administrators dump daily SQL or WAL archive files to a local directory. A nightly cron job runs `aws s3 sync` to push only the newly generated backup files to S3. By bypassing `aws s3 cp --recursive`, they avoid re-uploading massive historical dumps every single night.

**Cross-Region Disaster Recovery**

```bash
aws s3 sync s3://prod-us-east-1-data s3://dr-us-west-2-data --exact-timestamps --delete
```

> For compliance requirements that prohibit the use of native S3 Cross-Region Replication (CRR)—or when migrating buckets across different AWS partition architectures (like AWS GovCloud)—engineers run `aws s3 sync` to guarantee the secondary bucket remains a byte-for-byte exact replica of the primary bucket.

## When should it NOT be used?

- **Continuous, real-time two-way syncing:** **Do not use `aws s3 sync` as a Dropbox replacement.** It is strictly a unidirectional, point-in-time synchronization. It cannot handle conflict resolution if both source and destination are modified simultaneously. Use specialized two-way sync software or AWS Storage Gateway.
- **Massive, multi-terabyte index traversals:** **Do not use `aws s3 sync` on buckets with tens of millions of objects just to upload one new file.** The CLI must build an entire index of the remote bucket before deciding what to sync, which can take hours and cost significant money in `ListObjectsV2` API calls.
- **Strict cryptographic verification:** **Do not rely on `aws s3 sync` for MD5/SHA checksum diffing.** It _only_ compares file sizes and timestamps to determine changes. If a file experiences silent bit-rot without changing size or timestamp, `sync` will not detect it. Use `rclone` for checksum-based synchronization.

## Alternatives

- **`aws s3 cp`:** **Best for unconditional file transfers.** When you know a file needs to be transferred and don't want to waste time computing a diff against the remote bucket, `cp` begins the upload immediately.
- **`rclone`:** **Best for advanced diffing and multi-cloud environments.** A highly optimized, open-source Go binary. It supports checksum-based diffs, bandwidth rate-limiting, deeper concurrent control, and can sync directly between S3 and non-AWS providers (like Google Drive or Azure Blob).
- **`s3cmd`:** **Best for non-AWS S3-compatible endpoints.** An independent Python CLI tool predating the official AWS CLI. It handles edge cases, specific regex excludes, and alternate endpoint configurations more gracefully than the rigid AWS CLI profiles.
- **`AWS DataSync`:** **Best for petabyte-scale, continuous migrations.** A fully managed AWS service that utilizes a proprietary protocol to replicate massive amounts of data from on-premises NFS/SMB shares or other clouds directly to S3, bypassing the limitations of an HTTP-based CLI tool.

## How it works internally

`aws s3 sync` is implemented in Python via the `boto3` SDK and the underlying `s3transfer` module.

When invoked, the CLI enters a "pre-flight" phase. It recursively iterates through the local filesystem using `os.walk` and simultaneously queries the S3 destination using paginated `ListObjectsV2` REST API calls. It compiles an internal manifest of both the source and destination.

For each file, it performs a diff calculation. The default rule is: transfer the file if it does not exist in the destination, if the source file size differs from the destination, or if the source's `LastModified` timestamp is newer than the destination's. (Using `--exact-timestamps` or `--size-only` alters this logical condition).

Once the diff is calculated, the CLI queues the necessary operations (uploads, downloads, copies, and deletions if `--delete` is passed). These operations are dispatched to a `ThreadPoolExecutor`. For files larger than the `multipart_threshold` (default 8MB), `s3transfer` automatically splits the file into chunks and executes `CreateMultipartUpload`, concurrent `UploadPart` calls, and finally `CompleteMultipartUpload`. Deletions queue a batch `DeleteObjects` request. All API calls are authenticated automatically using AWS Signature Version 4.

## Performance Notes

- **Tuning Concurrent Requests:** By default, the CLI uses only 10 threads for transfers. If you have high network bandwidth and are syncing thousands of files, this is a massive bottleneck. Run `aws configure set default.s3.max_concurrent_requests 50` to drastically increase thread count and transfer speed.
- **Pagination Bottlenecks:** `ListObjectsV2` returns a maximum of 1,000 objects per API call. Syncing an S3 prefix containing 500,000 files requires 500 sequential HTTP requests before the sync actually begins transferring any bytes. Narrow your sync scope (e.g., sync a specific sub-folder) to avoid extreme startup latency.
- **S3 Transfer Acceleration:** To improve throughput when syncing data over long geographic distances across the public internet, enable Transfer Acceleration on the bucket and append `--endpoint-url https://s3-accelerate.amazonaws.com` to route traffic onto AWS's private edge backbone.

## Security Notes

- **Catastrophic Deletion via `--delete`:** If you accidentally empty a local directory (e.g., due to a failed build step) and subsequently run `aws s3 sync ./build s3://bucket/ --delete`, the CLI will faithfully mirror your empty local directory and permanently delete every single file in the S3 bucket. Always wrap automated `--delete` commands in validation checks.
- **Cross-Account Object Ownership:** When syncing files from Account A to a bucket in Account B, the files remain owned by Account A by default. Account B cannot read them. To prevent this, the destination bucket should have "Bucket Owner Enforced" enabled, or you must append `--acl bucket-owner-full-control` so the destination account absorbs ownership.
- **KMS Throttling:** When syncing heavily with `--sse aws:kms` using high concurrency, you generate massive bursts of `GenerateDataKey` and `Decrypt` API calls to AWS KMS. This can quickly exhaust your KMS request quota, resulting in `ThrottlingException` errors and failing transfers.

## Common Mistakes

- **Misunderstanding Trailing Slashes**
  - _Mistake:_ Assuming S3 has physical directories. Running `aws s3 sync s3://bucket/folder s3://bucket/newfolder` instead of `s3://bucket/newfolder/`.
  - _Why:_ S3 operates on a flat namespace using string prefixes. Failing to use consistent trailing slashes can cause files to be dumped into the root of the bucket with strange concatenated names, rather than nested properly.
- **Misordering Include/Exclude Filters**
  - _Mistake:_ Running `aws s3 sync . s3://bucket/ --include "*.csv" --exclude "*"`.
  - _Why:_ The AWS CLI evaluates filter arguments from left to right. In this example, it includes CSVs, but then the subsequent `--exclude "*"` completely overrides it and excludes everything. You must exclude first, then explicitly include: `--exclude "*" --include "*.csv"`.
- **Using `sync` for file renames**
  - _Mistake:_ Changing a file extension locally and running `sync` without `--delete`, expecting the remote file to be renamed.
  - _Why:_ S3 does not support native rename operations. A rename is technically a new file creation. The sync will upload the new file, but leave the old, differently-named file sitting in the bucket unless `--delete` is used.

## Best Practices

- **Always Dry-Run Destructive Actions:** Never append `--delete` to a production script without manually executing the command with `--dryrun` first to audit the exact list of `(delete)` operations the CLI intends to perform.
- **Leverage `--size-only` for CI/CD:** If your deployment server performs a fresh `git clone` or re-compiles assets, the local timestamps will always be brand new, forcing `aws s3 sync` to uselessly re-upload identical files. Appending `--size-only` forces the CLI to skip files that haven't actually changed in size, vastly speeding up deployments.
- **Principle of Least Privilege:** When granting IAM permissions for a machine running `aws s3 sync`, scope the IAM Policy down to exactly `s3:ListBucket` (on the bucket ARN) and `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` (on the specific prefix ARN). Never grant `s3:*`.

## Interview Questions

**Q: How does `aws s3 sync` determine if a file needs to be transferred, and how can you override this behavior?**
**A:** By default, it compares the file size and the last-modified timestamp. It initiates a transfer if the source file size is different, or if the source timestamp is newer than the destination timestamp. You can override this to ignore timestamps entirely using `--size-only`, or enforce strict matching (where source _must_ be identical to destination) using `--exact-timestamps`.

**Q: You run `aws s3 sync ./data s3://my-bucket/ --delete`. However, several old files in the S3 bucket are not removed. What are the two most likely reasons?**
**A:** First, the IAM identity executing the command might lack the `s3:DeleteObject` permission, causing the delete operations to fail silently or explicitly. Second, the `--exclude` filter might be in play; `sync` will not delete remote files if they match a local exclusion rule, as it ignores them during the comparison phase entirely.

**Q: Why might `aws s3 sync` appear to hang or execute extremely slowly before any network transfer bandwidth is actually consumed?**
**A:** Because `aws s3 sync` is a state-aware synchronization tool, it must compile a complete list of objects from both the source and destination before it can calculate the diff. If the destination S3 bucket contains millions of objects, the CLI must make thousands of paginated `ListObjectsV2` API calls. This index-building phase can take significant time before a single byte of file data is transferred.

## Practice Problems

**Problem:** You want to synchronize a local `/assets` directory to an S3 bucket named `prod-cdn`. You want to perfectly mirror the directory (removing old remote files), but you want to ensure no files ending in `.log` are ever uploaded or evaluated. Write the command to do this safely as a simulation first.
**Hint:** Use the flag for mirroring, the flag for pattern exclusion, and the flag that explicitly simulates the command without committing changes.
**Solution:**

```bash
aws s3 sync /assets s3://prod-cdn/ --delete --exclude "*.log" --dryrun
```

**Problem:** You need to backup a massive folder to S3. Your CI server alters file timestamps every run, so you only want Git to compare files based on their actual byte size to determine if an upload is necessary. Furthermore, you want to store these backups in the most cost-effective tier for rarely accessed data.
**Hint:** Use the flag that changes the diff algorithm, and the flag that sets the S3 object tier to a deep storage archive state.
**Solution:**

```bash
aws s3 sync ./backup s3://archive-bucket/ --size-only --storage-class DEEP_ARCHIVE
```

## References

- [AWS CLI Command Reference: s3 sync](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/sync.html)
- [AWS CLI S3 Configuration (Boto3 Transfer Tuning)](https://docs.aws.amazon.com/cli/latest/topic/s3-config.html)
- [Amazon S3 Storage Classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
