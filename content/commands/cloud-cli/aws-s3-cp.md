---
slug: aws-s3-cp
name: aws s3 cp
aliases: []
category: cloud-cli
tags: [aws, s3, storage, object-storage, file-transfer, cloud]
difficulty: beginner
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, cmd, sh]
intentPhrases:
  - 'upload file to s3 bucket'
  - 'download object from s3'
  - 'copy s3 object to another bucket'
  - 'transfer local directory to s3'
  - 'move file to aws storage'
relatedCommands: [aws-s3-sync, aws-s3-ls]
alternatives: [aws-s3-sync]
status: draft
---

## What is it?

`aws s3 cp` is a high-level command-line utility within the AWS CLI used to copy files and objects to, from, or between Amazon Simple Storage Service (S3) buckets. It abstracts away the complex REST API calls required for S3 object manipulation, enabling users to seamlessly upload local files to the cloud, download cloud objects to a local disk, or duplicate objects across different S3 buckets with a familiar, POSIX-like interface.

## Why does it exist?

Directly interacting with the S3 REST API for file transfers requires complex cryptographic request signing (AWS Signature Version 4), manual multipart upload chunking for large files, and extensive error handling for network timeouts. `aws s3 cp` was created within the high-level `s3` namespace to handle all of this orchestration under the hood. It exists to provide a simple, human-friendly command that automatically parallelizes large transfers, calculates checksums, and manages the intricate multi-step API processes required to reliably upload or copy multi-gigabyte objects over unstable networks.

## Syntax

```bash
aws s3 cp <LocalPath> <S3Uri> [options]
aws s3 cp <S3Uri> <LocalPath> [options]
aws s3 cp <S3Uri> <S3Uri> [options]
```

## Flags

| Flag              | Description                                                                                                            | Example                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `--recursive`     | Indicates that the command should operate on all files and subdirectories within the specified directory or S3 prefix. | `aws s3 cp ./data s3://bucket/data --recursive`                        |
| `--dryrun`        | Simulates the copy operation without actually transferring any data, useful for verifying inclusion/exclusion filters. | `aws s3 cp ./logs s3://bucket/logs --recursive --dryrun`               |
| `--exclude`       | Excludes files or objects that match the specified pattern. Evaluated sequentially alongside `--include`.              | `aws s3 cp . s3://bucket/ --recursive --exclude "*.tmp"`               |
| `--include`       | Includes files or objects that match the specified pattern, overriding previous `--exclude` rules.                     | `aws s3 cp . s3://bucket/ --recursive --exclude "*" --include "*.txt"` |
| `--storage-class` | Specifies the S3 storage class for the uploaded object (e.g., `STANDARD`, `GLACIER`, `INTELLIGENT_TIERING`).           | `aws s3 cp backup.zip s3://bucket/ --storage-class GLACIER`            |
| `--acl`           | Applies a canned Access Control List (ACL) to the uploaded object, such as `private` or `public-read`.                 | `aws s3 cp image.jpg s3://bucket/ --acl public-read`                   |
| `--sse`           | Enables Server-Side Encryption on the destination object. Accepts `AES256` or `aws:kms`.                               | `aws s3 cp file.txt s3://bucket/ --sse aws:kms`                        |
| `--metadata`      | Attaches a map of custom key-value pairs as metadata to the destination object.                                        | `aws s3 cp file.txt s3://bucket/ --metadata "project=alpha,env=prod"`  |
| `--cache-control` | Sets the `Cache-Control` HTTP header for the object, directing how web browsers/CDNs should cache it.                  | `aws s3 cp index.html s3://bucket/ --cache-control "max-age=3600"`     |
| `--content-type`  | Explicitly sets the MIME type of the object, overriding the CLI's automatic file extension guessing.                   | `aws s3 cp data.csv s3://bucket/ --content-type "text/csv"`            |
| `-q`, `--quiet`   | Suppresses standard output, hiding the progress bar and transfer summary. Errors are still printed to stderr.          | `aws s3 cp script.sh s3://bucket/ -q`                                  |

## Examples

```bash
aws s3 cp ./report.pdf s3://my-company-bucket/reports/2023/
```

> Uploads a single local file (`report.pdf`) to the specified S3 bucket and prefix. Because no destination filename is explicitly provided, it retains the name `report.pdf` in S3.

```bash
aws s3 cp s3://my-company-bucket/configs/app.json ./local-config.json
```

> Downloads an object from S3 to the local filesystem and simultaneously renames it to `local-config.json`. This is the standard workflow for pulling specific configuration files during application bootstrapping.

```bash
aws s3 cp s3://source-bucket/dataset.csv s3://dest-bucket/dataset.csv
```

> Copies an object directly from one S3 bucket to another. This operation is performed entirely within the AWS network; the file data is not downloaded to the client's local machine and uploaded again.

```bash
aws s3 cp ./assets s3://website-bucket/assets --recursive --exclude "*.map"
```

> Uploads the entire local `assets` directory to the S3 bucket, recursively recreating the folder structure. It ignores any files ending in `.map` (such as Javascript source maps), keeping the deployment artifact clean.

```bash
aws s3 cp ./archive.tar s3://cold-storage-bucket/ --storage-class DEEP_ARCHIVE --sse aws:kms
```

> Uploads a large archive directly into the `DEEP_ARCHIVE` storage tier to minimize storage costs, while simultaneously enforcing AWS Key Management Service (KMS) server-side encryption for compliance.

## Real-World Scenarios

**Deploying Static Web Assets with Cache Headers**

```bash
aws s3 cp ./build s3://my-frontend-bucket/ --recursive --cache-control "public, max-age=31536000, immutable"
```

> When deploying a React or Angular Single Page Application (SPA), engineers upload the compiled build directory directly to an S3 bucket configured for static website hosting. By injecting aggressive `Cache-Control` headers, they ensure CloudFront and user browsers cache the hashed assets indefinitely, drastically reducing bandwidth costs.

**Cross-Account Database Backup Migration**

```bash
aws s3 cp s3://prod-account-backups/db-2023.sql s3://audit-account-backups/ --profile audit-role --acl bucket-owner-full-control
```

> DevOps engineers regularly copy database snapshots across AWS accounts for compliance and auditing. Using a specific AWS profile, the CLI authenticates to the destination account. The `--acl bucket-owner-full-control` flag is critical here; without it, the destination bucket owner wouldn't actually have permissions to read the newly copied object due to cross-account ownership rules.

**Filtering Specific File Types for Data Lakes**

```bash
aws s3 cp ./data_pipeline/ s3://datalake-ingest/raw/ --recursive --exclude "*" --include "*.parquet" --include "*.snappy"
```

> When uploading local data processing outputs to a centralized S3 Data Lake, engineers use explicit exclude/include chains. By excluding everything (`*`) and selectively including only columnar data formats (`*.parquet`), they prevent accidental uploads of temporary files, scripts, or `.DS_Store` junk files that could break downstream Athena queries.

## When should it NOT be used?

- **Syncing entire directories with deltas:** **Do not use `cp --recursive` for repeating backups.** `cp` will blindly re-upload every file even if the remote file is identical. Use `aws s3 sync` instead, which compares file sizes and modification times to only transfer changed deltas.
- **Low-level S3 API manipulation:** **Do not use `cp` if you need fine-grained control over multipart upload IDs or parts.** `cp` abstracts the multipart process. If you need to manually construct parts or abort stale multipart uploads programmatically, use `aws s3api put-object` or `aws s3api create-multipart-upload`.
- **Massive, multi-Terabyte migrations:** **Do not use `aws s3 cp` to migrate 100TB of data across regions.** The AWS CLI is not optimized for massive horizontal scaling or persistent retry tracking over weeks. Use AWS DataSync for managed network migrations or AWS Snowball for physical data transfer.

## Alternatives

- **`aws s3 sync`:** **Best for delta-based folder mirroring.** Sync performs a diff between the source and destination before transferring, skipping files that already exist and haven't changed, making it significantly faster for repetitive directory uploads.
- **`s3cmd`:** **Best for non-AWS S3-compatible endpoints.** An independent Python tool that has long predated the official AWS CLI. It is often favored when interacting with third-party S3-compatible APIs (like DigitalOcean Spaces or MinIO) where AWS CLI profile configurations might be cumbersome.
- **`rclone`:** **Best for multi-cloud environments.** A standalone, highly optimized Go binary that supports S3 along with dozens of other cloud providers (Google Drive, Azure Blob, Dropbox). It offers far superior bandwidth control, concurrency limits, and retry logic compared to the standard AWS CLI.
- **`aws s3api`:** **Best for raw REST API execution.** The `s3api` namespace maps 1:1 with the underlying S3 REST API. It is required for operations `s3 cp` cannot do, such as setting Object Retention (Object Lock), configuring bucket policies, or retrieving specific object version IDs.

## How it works internally

`aws s3 cp` is built on top of `boto3`, the official AWS SDK for Python. Unlike simple POSIX tools, it does not just open a file stream and write bytes. It employs a highly sophisticated, multi-threaded transfer manager.

When an upload is initiated, the CLI examines the source file size. If the file is smaller than the configured `multipart_threshold` (default 8MB), it makes a single, standard `PutObject` HTTP request. If the file is larger, the transfer manager automatically splits the file into chunks (defined by `multipart_chunksize`, default 8MB). It sends a `CreateMultipartUpload` request to S3 to acquire an Upload ID. It then utilizes a Python `ThreadPoolExecutor` to upload these chunks concurrently across multiple HTTP connections using the `UploadPart` API. Once all threads succeed, it issues a `CompleteMultipartUpload` request to stitch the object together on the S3 side.

For S3-to-S3 copies, the client does not download the data. Instead, it issues a `CopyObject` API call for files under 5GB. For objects over 5GB, it seamlessly orchestrates a multipart copy using the `UploadPartCopy` API, commanding the AWS backend to stream the data directly between storage nodes without routing through the internet or the user's local machine.

All requests are cryptographically signed using AWS Signature Version 4 (SigV4). The CLI calculates a SHA256 hash of the payload (or the chunk) and signs the HTTP headers using the configured AWS IAM credentials to authenticate the request.

## Performance Notes

- **Tuning Concurrent Requests:** By default, the CLI uses 10 threads for transfers. For high-bandwidth connections, you can drastically improve throughput by increasing `max_concurrent_requests` in your `~/.aws/config` file (e.g., setting it to `20` or `50`).
- **Multipart Chunk Size:** If you are uploading massive files (e.g., 50GB database dumps), the default 8MB chunk size will generate too many parts (S3 limits objects to 10,000 parts). Increase the `multipart_chunksize` configuration setting to `50MB` or higher to prevent API exhaustion and reduce request overhead.
- **S3 Transfer Acceleration:** If you are uploading over long geographic distances, you can enable Transfer Acceleration on the bucket and append the `--endpoint-url` flag (pointing to the `s3-accelerate.amazonaws.com` edge location) to route your upload through optimized AWS CloudFront backbones.

## Security Notes

- **Metadata is Plaintext:** Any custom data passed via the `--metadata` flag is transmitted and stored as standard HTTP headers. While the transmission is TLS-encrypted, the metadata itself is visible in plaintext to anyone with `s3:GetObject` permissions. Never store PII or cryptographic keys in object metadata.
- **IAM vs ACLs:** Avoid using the `--acl` flag in modern AWS environments. AWS strongly recommends enforcing "S3 Object Ownership: Bucket Owner Enforced", which disables ACLs entirely. Rely on IAM Policies and Bucket Policies for access control instead of legacy object-level ACLs.
- **Forcing Encryption:** While Amazon S3 now applies Server-Side Encryption with Amazon S3 managed keys (SSE-S3) by default, highly secure environments require Customer Managed Keys. You must explicitly pass `--sse aws:kms` and optionally `--sse-kms-key-id <key-arn>` to ensure the object is encrypted with the correct auditing key.

## Common Mistakes

- **Forgetting `--recursive` on directories**
  - _Mistake:_ Running `aws s3 cp ./myfolder s3://mybucket/` and getting a "warning: Skipping file" error.
  - _Why:_ Unlike the standard Unix `cp` command which requires `-r`, `aws s3 cp` explicitly requires the `--recursive` flag to traverse a local directory or an S3 prefix. Without it, the command assumes you are trying to copy a single file and will ignore directories.
- **Misordering Include/Exclude Filters**
  - _Mistake:_ Running `aws s3 cp . s3://bucket/ --recursive --include "*.txt" --exclude "*"` and finding that nothing was uploaded.
  - _Why:_ The AWS CLI evaluates filter rules sequentially from left to right. In this example, it includes `.txt` files, but the subsequent `--exclude "*"` rule overrides it and excludes absolutely everything. The `--exclude "*"` must come _first_.
- **Assuming a trailing slash acts like `rsync`**
  - _Mistake:_ Using `aws s3 cp s3://bucket/folder s3://bucket/newfolder` (without trailing slashes) intending to copy a directory, but accidentally creating an empty object named `newfolder`.
  - _Why:_ S3 does not have true directories; it has prefixes. To copy a "folder" of objects, you must append the `--recursive` flag. The trailing slash purely determines the string prefix applied to the destination keys.

## Best Practices

- **Always Dry-Run Complex Filters:** When using multiple `--exclude` and `--include` statements, always append `--dryrun` first. The logic is notoriously finicky, and a dry-run will output exactly which files are targeted without initiating costly S3 API calls.
- **Use IAM Roles, Not Access Keys:** When running `aws s3 cp` in CI/CD pipelines (Jenkins, GitHub Actions) or on EC2 instances, never hardcode `AWS_ACCESS_KEY_ID`. Always assign an IAM Task/Instance Role. The CLI will automatically fetch and rotate temporary STS credentials under the hood.
- **Explicit Content Types for Web Hosting:** When uploading files without standard extensions (e.g., dynamically generated JSON blobs), S3 defaults the MIME type to `binary/octet-stream`. If serving these to browsers, explicitly pass `--content-type "application/json"` to ensure browsers render the file rather than forcing a download.

## Interview Questions

**Q: What is the underlying mechanism `aws s3 cp` uses to efficiently upload a 50GB file, and how does it deal with network interruptions?**
**A:** It automatically utilizes the S3 Multipart Upload API. The CLI splits the 50GB file into chunks (default 8MB) and uploads them concurrently using multiple threads. If a specific chunk's network connection drops, the CLI only needs to retry that individual 8MB chunk, rather than restarting the entire 50GB transfer from scratch.

**Q: You execute an `aws s3 cp` command to copy a 10GB file from `s3://bucket-a/` to `s3://bucket-b/`. Does this consume 10GB of your local network bandwidth?**
**A:** No. For S3-to-S3 transfers, the AWS CLI issues a `CopyObject` (or `UploadPartCopy` for large files) REST API call to AWS. The actual data transfer occurs internally across the AWS backbone network between storage nodes. Your local machine only sends the control plane API requests and consumes negligible bandwidth.

**Q: How does `aws s3 cp` differ from `aws s3 sync` when transferring a directory?**
**A:** `aws s3 cp --recursive` is a blunt operation; it will unconditionally attempt to `PutObject` for every single file in the source directory. `aws s3 sync` compares the size and last-modified timestamp of the source and destination files, and only transfers files that are new or have been updated, saving significant time and API costs.

## Practice Problems

**Problem:** You have a local directory called `reports/` containing hundreds of files. You want to upload this entire directory to `s3://financial-data/2023/`, but you only want to upload files that end with the `.csv` extension.
**Hint:** You need the flag for directory traversal, and you must chain an exclude rule _before_ an include rule to filter correctly.
**Solution:**

```bash
aws s3 cp ./reports/ s3://financial-data/2023/ --recursive --exclude "*" --include "*.csv"
```

**Problem:** You are uploading a sensitive database dump `db_dump.tar.gz` to `s3://secure-backups/`. Write the command to upload this file, ensure it is encrypted at rest using AWS KMS, and place it in the infrequent access storage tier to save money.
**Hint:** Use the flags for Server-Side Encryption and Storage Class modification.
**Solution:**

```bash
aws s3 cp db_dump.tar.gz s3://secure-backups/ --sse aws:kms --storage-class STANDARD_IA
```

## References

- [AWS CLI Command Reference: s3 cp](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html)
- [AWS CLI S3 Configuration (Boto3 Transfer Tuning)](https://docs.aws.amazon.com/cli/latest/topic/s3-config.html)
- [Amazon S3 Multipart Upload Overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
