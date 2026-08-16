---
slug: aws-s3-ls
name: aws s3 ls
aliases: []
category: cloud-cli
tags:
  - aws
  - cloud
  - s3
  - storage
  - listing
  - object-storage
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
  - sh
intentPhrases:
  - list s3 buckets
  - list files in s3 bucket
  - show s3 folder contents
  - check s3 storage objects
  - find s3 bucket files
relatedCommands:
  - aws-configure
  - aws-sts-get-caller-identity
  - aws-s3-cp
  - aws-s3-sync
alternatives: []
status: draft
---

## What is it?

`aws s3 ls` is a high-level AWS CLI command used to list Amazon S3 buckets across an account, as well as the objects and virtual directories stored within a specific S3 bucket or prefix. It abstracts the underlying REST API calls into a clean, hierarchical file-system-like view resembling the standard Unix `ls` command.

## Why does it exist?

Querying Amazon S3 storage inventory programmatically requires interacting with low-level REST APIs (`ListBuckets` and `ListObjectsV2`), which return complex XML payloads, require manual pagination token handling, and demand cryptographic SigV4 signing. `aws s3 ls` exists to bridge this operational gap by providing an intuitive, developer-friendly interface to instantly inspect cloud storage inventories without writing custom parsing scripts.

## Syntax

```bash
aws s3 ls [S3_URL] [--recursive] [--human-readable] [--summarize] [options]
```

## Flags

| Flag                    | Description                                                                                          | Example                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `--recursive`           | Recursively lists all objects across all sub-prefixes (folders) within the target bucket.            | `aws s3 ls s3://my-bucket --recursive`                   |
| `--human-readable`      | Prints file sizes in an easily readable format (e.g., KB, MB, GB) instead of raw bytes.              | `aws s3 ls s3://my-bucket --human-readable`              |
| `--summarize`           | Displays total object count and cumulative storage size statistics at the end of the listing output. | `aws s3 ls s3://my-bucket --recursive --summarize`       |
| `--page-size <value>`   | Limits the number of results returned per API request page to prevent memory bottlenecks.            | `aws s3 ls s3://my-bucket --page-size 100`               |
| `--profile <name>`      | Specifies a named AWS CLI profile to execute the listing under a specific IAM identity.              | `aws s3 ls --profile production`                         |
| `--region <region>`     | Overrides the default region, directing the listing request to a specific regional S3 endpoint.      | `aws s3 ls s3://my-bucket --region us-west-2`            |
| `--endpoint-url <url>`  | Overrides standard AWS endpoints with custom URLs (essential for testing via LocalStack).            | `aws s3 ls --endpoint-url http://localhost:4566`         |
| `--no-verify-ssl`       | Disables SSL certificate verification, useful behind corporate interception proxies.                 | `aws s3 ls s3://my-bucket --no-verify-ssl`               |
| `--request-payer <val>` | Specifies requester-pays parameters for accessing data in third-party billing buckets.               | `aws s3 ls s3://shared-bucket --request-payer requester` |
| `--no-paginate`         | Disables automatic pagination of API results, returning only the first default API page.             | `aws s3 ls s3://my-bucket --no-paginate`                 |
| `--debug`               | Enables verbose diagnostic logging, exposing raw HTTP requests and XML response payloads.            | `aws s3 ls --debug`                                      |

## Examples

```bash
aws s3 ls
```

> This lists all Amazon S3 buckets owned by the authenticated AWS account identity in your default region, displaying their creation timestamps and bucket names.

```bash
aws s3 ls s3://my-production-bucket
```

> This queries a specific S3 bucket (`my-production-bucket`), listing top-level prefixes (folders) and objects stored directly at the root level of the bucket.

```bash
aws s3 ls s3://my-bucket/logs/2026/ --recursive
```

> This performs a recursive scan inside a specific virtual folder path (`logs/2026/`), listing every nested object file regardless of directory depth.

```bash
aws s3 ls s3://my-bucket --human-readable --summarize
```

> This lists bucket contents while formatting file sizes into human-readable units and appending a comprehensive summary report displaying total object count and aggregate storage size at the bottom.

```bash
aws s3 ls s3://my-bucket --profile staging-admin --region eu-west-1
```

> This executes the listing request using a specific IAM profile (`staging-admin`) and explicitly targets the European regional endpoint to ensure compliance and avoid cross-region latency.

## Real-World Scenarios

**Auditing Storage Inventory and Orphaned Logs**

```bash
aws s3 ls s3://company-audit-logs/2025/ --recursive --human-readable
```

> Compliance officers and infrastructure engineers routinely use recursive, human-readable listings to audit historical log archival buckets, verify retention policies, and track storage footprint growth over time.

**Validating Deployment Artifact Uploads in CI/CD Pipelines**

```bash
aws s3 ls s3://deployment-artifacts-bucket/v2.4.0/
```

> Automated deployment pipelines execute targeted S3 listings immediately after build phases to confirm that compiled binaries, zip archives, or container tarballs were successfully pushed to their designated S3 staging prefixes before initiating downstream server updates.

**Investigating Broken Application File References**

```bash
aws s3 ls s3://user-uploads-bucket/profiles/user_98765/
```

> When customer support reports missing user avatars or corrupted asset links, support engineers use S3 listings to inspect specific user storage prefixes, confirming whether the underlying media objects actually exist in cloud storage.

## When should it NOT be used?

- **Programmatic parsing in complex shell scripts:** Using `aws s3 ls` outputs directly in automated parsing logic. **Reason:** The default output format is designed for human readability (columns with dates and sizes) and is notoriously brittle to parse robustly via `awk` or `sed`. **Use instead:** `aws s3api list-objects-v2` with `--output json` and JMESPath queries.
- **Auditing billions of objects in massive data lakes:** Running `aws s3 ls s3://massive-lake --recursive`. **Reason:** Traversing petabyte-scale buckets recursively via standard CLI listings is exceptionally slow and prone to timeout errors. **Use instead:** S3 Inventory reports or AWS Athena queries against S3 access logs.
- **Checking granular object access permissions:** Using `aws s3 ls` to determine if a user has read or write access to individual files. **Reason:** The command checks bucket-level and basic listing permissions (`s3:ListBucket`), not fine-grained object ACLs or KMS decryption policies. **Use instead:** `aws s3api get-object-acl` or policy simulators.

## Alternatives

- **`aws s3api list-objects-v2`:** The low-level API wrapper for S3 object listing. **Tradeoff:** It requires verbose syntax and outputs raw JSON instead of human-readable columns, but it provides precise, programmatic control over pagination tokens, object metadata, and filtering.
- **`s3cmd`:** A mature third-party command-line client for S3. **Tradeoff:** `s3cmd` offers powerful sync and management utilities with fine-grained access control management, but requires separate installation and configuration outside the official AWS CLI ecosystem.

## How it works internally

When you execute `aws s3 ls`, the AWS CLI translates your high-level command into low-level Amazon S3 REST API requests.

If invoked without an S3 URL (`aws s3 ls`), the CLI sends a `GET` request to the S3 Service endpoint executing the `ListBuckets` API operation, returning an XML document containing all buckets owned by the authenticated account.

If invoked with a bucket URI (`aws s3 ls s3://bucket-name`), the CLI invokes the `ListObjectsV2` API operation. S3 stores objects in a flat namespace rather than a true hierarchical filesystem; virtual directories are merely simulated using common prefixes (delimiters like `/`). The CLI handles pagination automatically behind the scenes using `NextContinuationToken` XML elements, looping through API pages until all matching objects are retrieved. Finally, the CLI formats the raw XML response into columnar text (displaying timestamps, file sizes, and keys) and prints it to standard output. The command exits with `0` on success, or non-zero if access is denied or the bucket does not exist.

## Performance Notes

- Listing exceptionally large buckets containing millions of objects can consume significant local memory and network bandwidth because the CLI must fetch and buffer multiple API result pages.
- Using `--recursive` on deeply nested storage hierarchies forces S3 to traverse every object key matching the prefix, which increases API latency and request costs (S3 charges per 1,000 LIST requests).

## Security Notes

- **IAM Least Privilege Enforcement:** To successfully run `aws s3 ls`, the calling principal must possess the `s3:ListBucket` permission for the target bucket, and `s3:ListAllMyBuckets` if listing account-wide buckets. Overly permissive roles risk exposing storage inventories.
- **Public Bucket Exposure:** Running listings against misconfigured public buckets can inadvertently expose sensitive enterprise data inventories. Always verify your IAM security boundaries and S3 Block Public Access settings.

## Common Mistakes

- **Forgetting the `s3://` protocol prefix:** Running `aws s3 ls my-bucket` instead of `aws s3 ls s3://my-bucket`. **Why it's wrong:** Omitting the `s3://` scheme causes the AWS CLI to treat the argument as a local filesystem path or throw a syntax parsing error.
- **Assuming listing proves object existence:** Checking if a file exists by running `aws s3 ls s3://bucket/file.txt`. **Why it's wrong:** If `file.txt` is actually a prefix containing sub-objects, `ls` will return contents rather than a clean boolean check. Use `aws s3api head-object` for precise file existence validation.
- **Ignoring regional endpoint mismatches:** Running listings against buckets in locked regions without specifying `--region`. **Why it's wrong:** While S3 is globally accessible via redirection, cross-region requests incur performance penalties and can fail if VPC endpoints restrict traffic.

## Best Practices

- When scripting or automating workflows that require parsing S3 inventories, abandon `aws s3 ls` and standardize on `aws s3api list-objects-v2 --output json` for reliable JSON parsing.
- Always utilize `--page-size` when scanning moderately large buckets to prevent local memory exhaustion and socket timeout disconnects during heavy data transfers.
- Combine `--human-readable` and `--summarize` when conducting manual storage audits to immediately grasp bucket size footprints without manual arithmetic.

## Interview Questions

**Q:** What is the fundamental operational difference between running `aws s3 ls` and `aws s3api list-objects-v2`?
**A:** `aws s3 ls` is a high-level command designed for human operators, automatically handling pagination behind the scenes and formatting raw XML responses into clean, columnar text output. `aws s3api list-objects-v2` is a low-level wrapper that communicates directly with the S3 REST API, outputting raw JSON data and requiring manual token handling for advanced pagination control.

**Q:** How does Amazon S3 simulate folder structures when you execute `aws s3 ls s3://bucket/folder/`, given that S3 is a flat object storage architecture?
**A:** Amazon S3 does not have a true hierarchical directory structure; it uses a flat namespace of key strings. When you run `aws s3 ls` with a prefix delimiter (like `/`), S3 uses the `CommonPrefixes` and delimiter features in the `ListObjectsV2` API to group object keys sharing the same string prefix, emulating folder behavior for the user.

**Q:** Why is using `aws s3 ls s3://bucket --recursive` considered a poor choice for programmatic parsing or automation scripts in enterprise data lakes?
**A:** `aws s3 ls` outputs unstructured text designed strictly for terminal rendering. Parsing columnar text via shell utilities like `awk` or `sed` is highly brittle and breaks when filenames contain spaces or special characters. Furthermore, recursive listings on massive buckets are slow, expensive, and lack structured error handling compared to native JSON API responses.

## Practice Problems

**Problem:** List all Amazon S3 buckets currently owned by your AWS account identity across the entire region.
**Hint:** Invoke the basic command without specifying any bucket URL or arguments.
**Solution:** `aws s3 ls` (This queries the account's root S3 endpoint and returns a list of all accessible buckets).

**Problem:** Recursively list all files inside `s3://data-archive-bucket/2026/` while ensuring that file sizes are displayed in human-readable units and a final storage summary is printed at the end.
**Hint:** Combine the recursive flag with the human-readable formatting flag and the statistics summary flag.
**Solution:** `aws s3 ls s3://data-archive-bucket/2026/ --recursive --human-readable --summarize` (This scans all nested objects, formats storage sizes into KB/MB/GB, and calculates total object counts and storage footprints).

## References

- [AWS CLI Command Reference - s3 ls](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/ls.html)
- [Amazon S3 API Reference - ListObjectsV2](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html)
