---
slug: az-storage-blob-upload
name: az storage blob upload
aliases: []
category: cloud-cli
tags: [azure, cloud, storage, blob, upload, transfer]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'upload file to azure blob storage'
  - 'upload local file to azure container'
  - 'transfer file to azure storage az cli'
  - 'put blob azure storage'
  - 'send backup to azure container'
relatedCommands: [az-login]
alternatives: [az-webapp-up]
status: draft
---

## What is it?

`az storage blob upload` is an Azure CLI command used to transfer local files into an Azure Storage container as blobs. It abstracts low-level REST API calls, chunking logic, and cryptographic signing into a single interface for managing object storage data.

## Why does it exist?

Interacting with Azure Blob Storage natively requires constructing authenticated HTTPS requests against the Azure Storage REST API, managing Shared Key or token signing headers, and handling block chunking for large files manually. `az storage blob upload` exists to bridge this gap, providing a secure, high-level command-line tool to ingest local files into cloud containers without writing custom SDK or HTTP client code.

## Syntax

```bash
az storage blob upload --container-name <value> --name <value> --file <value> [--account-name <value>] [--account-key <value>] [--connection-string <value>] [--auth-mode <value>] [--sas-token <value>] [options]
```

## Flags

| Flag                     | Description                                                                                       | Example                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--container-name`, `-c` | Specifies the name of the Azure Storage container where the blob will be stored.                  | `az storage blob upload -c mycontainer --name file.txt --file ./local.txt`                               |
| `--name`, `-f`           | Defines the destination blob name (key path) within the storage container.                        | `az storage blob upload -c mycontainer --name reports/2026.pdf --file ./2026.pdf`                        |
| `--file`, `-f`           | Specifies the absolute or relative path to the local file being uploaded.                         | `az storage blob upload -c mycontainer --name app.zip --file /var/app.zip`                               |
| `--account-name`         | Specifies the target Azure Storage account name.                                                  | `az storage blob upload --account-name mystorageacct -c c1 --name b1 --file f1.txt`                      |
| `--account-key`          | Provides the storage account access key for shared key authentication.                            | `az storage blob upload --account-key "key==" --account-name mystorageacct ...`                          |
| `--connection-string`    | Accepts the complete storage account connection string containing credentials and endpoints.      | `az storage blob upload --connection-string "DefaultEndpointsProtocol=..." ...`                          |
| `--auth-mode`            | Sets the authorization mode; accepts `key` (default) or `login` to use Microsoft Entra ID (RBAC). | `az storage blob upload --auth-mode login -c mycontainer --name b.txt --file f.txt`                      |
| `--sas-token`            | Provides a Shared Access Signature (SAS) token for scoped, time-bound authentication.             | `az storage blob upload --sas-token "se=2026-..." -c c1 --name b1 --file f1.txt`                         |
| `--tier`                 | Specifies the storage tier for the uploaded blob (`Hot`, `Cool`, `Cold`, or `Archive`).           | `az storage blob upload -c mycontainer --name b.zip --file ./b.zip --tier Cool`                          |
| `--content-type`         | Sets the MIME content type header assigned to the blob in storage.                                | `az storage blob upload -c mycontainer --name index.html --file ./index.html --content-type "text/html"` |
| `--overwrite`            | Forces the command to overwrite an existing blob if a file with the same name already exists.     | `az storage blob upload -c mycontainer --name data.csv --file ./data.csv --overwrite`                    |
| `--max-connections`      | Defines the maximum number of parallel parallel worker connections used for chunked uploads.      | `az storage blob upload -c mycontainer --name large.iso --file ./large.iso --max-connections 8`          |

## Examples

```bash
az storage blob upload --container-name documents --name report.pdf --file ./local_report.pdf
```

> This uploads a local file named `local_report.pdf` into the Azure storage container `documents` under the blob name `report.pdf`, authenticating automatically via your active CLI login context.

```bash
az storage blob upload -c backups --name db_dump.bak --file /backups/db.bak --account-name prodstorage --auth-mode login
```

> This uploads a database backup file to the `prodstorage` account using Microsoft Entra ID (`--auth-mode login`) instead of shared access keys, ensuring compliance with modern security standards.

```bash
az storage blob upload -c archive --name media.mp4 --file ./media.mp4 --tier Archive --overwrite
```

> This uploads a media file directly into the cost-effective `Archive` storage tier and includes the `--overwrite` flag to safely replace any existing blob with the identical filename.

```bash
az storage blob upload -c web --name assets/main.js --file ./dist/main.js --content-type "application/javascript"
```

> This assigns an explicit MIME content type (`application/javascript`) to the uploaded JavaScript asset, ensuring web browsers interpret and execute the file correctly when served via static website hosting.

```bash
az storage blob upload -c staging --name payload.tar.gz --file ./payload.tar.gz --connection-string "DefaultEndpointsProtocol=https;AccountName=..."
```

> This bypasses default profile resolution by supplying an explicit storage account connection string directly to the upload command for isolated script execution.

## Real-World Scenarios

**Archiving Production Database Backups**

```bash
az storage blob upload --account-name backupstore --container-name db-dumps --name "sql/$(date +%F)/backup.sql.gz" --file /var/backups/db.sql.gz --tier Cool --auth-mode login
```

> Systems administrators use scheduled shell scripts to push compressed daily database dumps directly into cloud storage containers configured with the cost-optimized `Cool` storage tier for disaster recovery compliance.

**Deploying Static Frontend Web Assets to Cloud Storage**

```bash
az storage blob upload-batch -s ./dist -d '$web' --account-name webfrontendstorage --auth-mode login
```

> Frontend web engineers automate continuous integration pipelines by uploading compiled static application bundles directly into Azure's designated static website container (`$web`), publishing production updates instantly.

**Transferring Heavy Log Archives for Long-Term Auditing**

```bash
az storage blob upload -c audit-logs --name "2026/08/syslog.tar.gz" --file /var/log/syslog.tar.gz --tier Archive --auth-mode login
```

> Compliance engineering teams securely ingest multi-gigabyte historical system log archives directly into the `Archive` tier, minimizing long-term data retention expenditures.

## When should it NOT be used?

- **Transferring multi-terabyte enterprise data lakes or massive directory trees:** Using `az storage blob upload` file-by-file for thousands of items. **Reason:** The command processes items sequentially or with basic threading, making it significantly slower and less resilient to network disruptions than dedicated bulk transfer tools. **Use instead:** `azcopy`, which utilizes multi-threaded block concurrency optimized for high-throughput cloud migration.
- **Syncing local directory structures incrementally:** **Reason:** `az storage blob upload` targets individual files; it lacks native delta-sync logic to detect changed local files versus existing cloud blobs. **Use instead:** `az storage blob upload-batch` or `azcopy sync`.
- **Running inside ephemeral serverless environments with tight execution timeouts:** **Reason:** Uploading very large single files over unstable network connections via a CLI wrapper can exceed cloud function or container timeout thresholds. **Use instead:** Pre-signed Shared Access Signature (SAS) URLs enabling direct client-side uploads.

## Alternatives

- **`azcopy`:** A high-performance, command-line utility engineered specifically for copying data to and from Azure Storage. **Tradeoff:** `azcopy` is drastically faster and handles massive parallel migrations, retries, and directory syncing far better than the Azure CLI, but requires downloading and managing a separate binary executable.
- **`az storage blob upload-batch`:** A specialized Azure CLI command for recursive batch uploads. **Tradeoff:** It handles entire folders and pattern matching out-of-the-box, but shares the same underlying Python CLI performance overhead as `az storage blob upload`.

## How it works internally

When you execute `az storage blob upload`, the Azure CLI validates your local file path, resolves your authentication credentials (via shared keys, SAS tokens, or Microsoft Entra ID), and translates the command into Azure Storage REST API calls.

Under the hood, the operation uses the Azure Storage SDK to perform either a **Put Blob** operation (for files typically under 256 MB) or a multi-part **Put Block / Put Block List** architecture (for larger files). Large files are sliced into discrete data blocks, hashed for integrity verification, and transmitted in parallel across HTTP/HTTPS channels controlled by `--max-connections`. Once all individual blocks are successfully received and registered by the Azure Storage backend, a final `Put Block List` commit transaction is executed, assembling the blocks into a unified, accessible blob object. The command returns an exit code of `0` upon successful verification, or a non-zero error code if network failure or authentication rejection occurs.

## Performance Notes

- Uploading large files over high-latency networks can be substantially accelerated by increasing the `--max-connections` parameter, allowing the CLI to open multiple parallel TCP/HTTP sockets to transfer distinct blocks concurrently.
- Network throughput can be heavily bottlenecked by local disk I/O and CPU overhead during block hashing and encryption processes, particularly on low-tier virtual machine instances.

## Security Notes

- **Credential Exposure via Connection Strings:** Supplying plaintext storage account keys or connection strings directly on the command line exposes secrets to local process table inspection (`ps aux`) and command-line history files. Always prefer `--auth-mode login` with Microsoft Entra ID RBAC.
- **Transport Layer Encryption:** All data transfers enforced by `az storage blob upload` occur strictly over encrypted HTTPS channels, protecting data-in-transit from man-in-the-middle interception.

## Common Mistakes

- **Omitted Container Creation:** Running `az storage blob upload` targeting a container name that has not yet been created in the storage account. **Why it's wrong:** The API call fails instantly with a `ContainerNotFound` error. You must provision the container beforehand using `az storage container create`.
- **Hardcoding storage keys in shared scripts:** Storing primary storage account access keys directly in plain-text deployment scripts. **Why it's wrong:** If the script is committed to a public or semi-private code repository, the account key is permanently compromised, granting full administrative access to all storage containers.
- **Confusing blob names with local file paths:** Specifying the `--name` parameter with a local directory structure instead of the intended cloud destination key. **Why it's wrong:** This causes the blob to be mislabeled or nested incorrectly within virtual directory prefixes in the storage container.

## Best Practices

- Always prefer Microsoft Entra ID authentication (`--auth-mode login`) over static storage account access keys to adhere to zero-trust architecture and eliminate static secret management risks.
- Use appropriate storage tiers (`--tier Cool` or `--tier Archive`) when uploading infrequently accessed files or backups to immediately reduce long-term cloud storage expenditures.
- In automation scripts, utilize environment variables or secure key vaults for connection strings and SAS tokens rather than passing them directly as raw terminal flags.

## Interview Questions

**Q:** What is the technical mechanism Azure Storage uses under the hood when you upload a very large file via `az storage blob upload`?
**A:** For large files, Azure Storage uses a multi-part upload architecture consisting of **Put Block** and **Put Block List** operations. The client slices the large file into distinct data blocks, uploads them in parallel across multiple connections, and finally issues a `Put Block List` commit transaction to instruct the Azure storage node to assemble and seal the blocks into a single cohesive blob.

**Q:** Why is utilizing `--auth-mode login` strongly recommended over supplying raw `--account-key` strings in production enterprise environments?
**A:** `--auth-mode login` leverages Microsoft Entra ID (RBAC) to issue temporary, scoped security tokens matching your user identity or managed identity. Supplying raw `--account-key` strings exposes permanent, high-privileged account secrets that cannot be easily audited, scoped down, or automatically rotated without breaking dependent applications.

**Q:** What error will the Azure CLI throw if you attempt to upload a file to a storage container that has not been initialized yet, and how do you resolve it?
**A:** The CLI will return a `ContainerNotFound` error because Azure Storage requires an explicit container namespace to exist before blobs can be registered inside it. You resolve this by executing `az storage container create --name <container-name>` prior to running the upload command.

## Practice Problems

**Problem:** Upload a local file named `config.json` to an Azure storage container called `settings` with the blob name `app/config.json`, authenticating via your active Microsoft Entra login session.
**Hint:** Combine the container name, blob name, local file path, and Entra ID authentication mode flags.
**Solution:** `az storage blob upload --container-name settings --name app/config.json --file ./config.json --auth-mode login` (This authenticates securely via RBAC and places the configuration file under the specified virtual directory prefix in the container).

**Problem:** Upload a massive archive file (`archive.tar.gz`) to the container `backups` in the storage account `datastores` while assigning it to the cost-effective `Archive` storage tier and forcing an overwrite if it already exists.
**Hint:** Combine account name, container name, blob name, file path, storage tier, and overwrite flags.
**Solution:** `az storage blob upload --account-name datastores --container-name backups --name archive.tar.gz --file ./archive.tar.gz --tier Archive --overwrite` (This directs the upload to the specified account, assigns the archive tier, and ensures clean replacement).

## References

- [Azure CLI Command Reference - az storage blob upload](https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest#az-storage-blob-upload)
- [Microsoft Learn: Upload blobs with Azure CLI](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-cli)
