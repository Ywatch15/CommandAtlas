---
slug: az-login
name: az login
aliases: []
category: cloud-cli
tags:
  - azure
  - authentication
  - entra-id
  - cli
  - cloud
  - identity
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
  - cmd
intentPhrases:
  - authenticate to azure
  - login to azure cli
  - connect to azure subscription
  - authenticate service principal azure
  - use managed identity azure cli
relatedCommands:
  - az-account-set
  - az-account-list
  - az-aks-get-credentials
  - az-storage-blob-upload
  - az-webapp-up
alternatives:
  - az-account-list
  - az-account-set
status: draft
---

## What is it?

`az login` is the primary authentication command for the Azure Command-Line Interface (Azure CLI). It orchestrates the OAuth 2.0 authorization flows required to acquire JSON Web Tokens (JWTs) from Microsoft Entra ID (formerly Azure Active Directory), authenticating the user or machine identity and granting the CLI access to Azure Resource Manager (ARM) APIs.

## Why does it exist?

Interacting with Azure's control plane requires cryptographically signed bearer tokens that expire frequently and require complex refresh cycles. Implementing the underlying Microsoft Authentication Library (MSAL) workflows—such as handling multifactor authentication (MFA) prompts, listening on localhost for authorization callbacks, or parsing instance metadata for managed identities—is incredibly tedious for developers. `az login` exists to abstract these authentication complexities into a single command, transparently managing token acquisition, caching, and rotation across diverse environments from local laptops to headless CI/CD runners.

## Syntax

```bash
az login [options]
```

## Flags

| Flag                       | Description                                                                                                                                                          | Example                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `--use-device-code`        | Initiates the OAuth 2.0 Device Authorization Grant flow, returning a code to be entered in a web browser on another device.                                          | `az login --use-device-code`                                               |
| `--service-principal`      | Indicates that the login is being performed by an automated Service Principal (application identity) rather than a user account.                                     | `az login --service-principal -u <app-id> -p <secret>`                     |
| `-t`, `--tenant`           | Specifies the Microsoft Entra ID tenant to authenticate against, using either the tenant ID (GUID) or the domain name.                                               | `az login --tenant contoso.onmicrosoft.com`                                |
| `-i`, `--identity`         | Authenticates using the system-assigned or user-assigned Managed Identity of the Azure resource executing the command (e.g., an Azure VM).                           | `az login --identity`                                                      |
| `-u`, `--username`         | The username or application ID (Client ID) used for authentication. Required when using `--service-principal` or legacy password flows.                              | `az login -u my-app-id`                                                    |
| `-p`, `--password`         | The password, client secret, or path to a PEM-formatted certificate file. Required when authenticating a Service Principal.                                          | `az login --service-principal -u <id> -p /path/to/cert.pem`                |
| `--federated-token`        | Authenticates a Service Principal using OpenID Connect (OIDC) workload identity federation, passing a token provided by an external identity provider (like GitHub). | `az login --service-principal -u <id> -t <tenant> --federated-token <jwt>` |
| `--allow-no-subscriptions` | Completes the login process even if the authenticated identity has no Azure subscriptions associated with it (useful for tenant-level administrative tasks).         | `az login --allow-no-subscriptions`                                        |
| `--scope`                  | Requests access tokens for a specific Azure API scope, rather than defaulting to the Azure Resource Manager (ARM) scope.                                             | `az login --scope https://graph.microsoft.com/.default`                    |
| `-o`, `--output`           | Formats the output of the resulting subscription context array (e.g., `json`, `table`, `tsv`).                                                                       | `az login -o table`                                                        |

## Examples

```bash
az login
```

> Initiates the standard interactive OAuth 2.0 Authorization Code flow. The CLI starts a local web server (usually on `http://localhost:8400`), opens the default system web browser to the Microsoft Entra ID login page, waits for the user to authenticate (including MFA), intercepts the callback code, and generates the access tokens.

```bash
az login --use-device-code
```

> Triggers the device code flow, outputting a short alphanumeric code and a URL (e.g., `https://microsoft.com/devicelogin`). You open that URL on any other device with a browser, enter the code, and authenticate. The CLI continuously polls the Microsoft Entra ID endpoint until the authorization is granted or times out.

```bash
az login --service-principal -u <app-id> -p <client-secret> --tenant <tenant-id>
```

> Authenticates headlessly using an Azure AD App Registration (Service Principal) and a symmetric client secret. This is a legacy automation workflow that bypasses interactive prompts, exchanging the client credentials directly for an ARM access token.

```bash
az login --identity
```

> Authenticates a workload running inside Azure (such as a Virtual Machine, Azure Function, or AKS pod) using an Azure Managed Identity. The CLI bypasses Entra ID public endpoints and instead queries the internal Azure Instance Metadata Service (IMDS) at `http://169.254.169.254` to extract a pre-authorized access token.

```bash
az login --tenant <guest-tenant-id>
```

> Authenticates the user specifically into a secondary tenant where they are a B2B Guest user. Without this flag, `az login` defaults to the user's home tenant, which hides subscriptions that belong to other organizations where the user has been invited as a guest.

## Real-World Scenarios

**CI/CD Pipeline Authentication with OIDC**

```bash
az login --service-principal -u $AZURE_CLIENT_ID -t $AZURE_TENANT_ID --federated-token $OIDC_TOKEN
```

> Modern GitHub Actions or GitLab CI runners use Workload Identity Federation to avoid storing long-lived client secrets. The pipeline platform generates an ephemeral OIDC token (`$OIDC_TOKEN`), which `az login` submits to Entra ID. Entra ID verifies the token's cryptographic signature against the external identity provider and issues an Azure access token, granting temporary, passwordless access to the runner.

**Headless Server Administration**

```bash
az login --use-device-code
```

> An administrator connects to a remote Linux server via SSH without X11 forwarding. Because the server has no graphical interface to launch a web browser, standard `az login` fails. Using `--use-device-code` allows the administrator to complete the MFA workflow on their personal laptop's browser, seamlessly authenticating the remote CLI session.

**Automated Azure VM Bootstrapping**

```bash
az login --identity -u <client-id-of-user-assigned-identity>
```

> A bash script injected via `cloud-init` runs on a newly provisioned Azure Virtual Machine. It uses `--identity` combined with a specific client ID to authenticate as a User-Assigned Managed Identity attached to the VM. The script then securely queries Azure Key Vault using the CLI to download TLS certificates without embedding any hardcoded credentials in the script itself.

## When should it NOT be used?

- **Within Application Code:** **Do not invoke `az login` from inside Python, .NET, or Node.js applications.** Relying on shell-outs to the Azure CLI for application authorization is fragile, slow, and insecure. Use the Azure SDK's `DefaultAzureCredential` (via the `Azure.Identity` libraries) which natively handles MSAL flows in the application's memory space.
- **Legacy User Automation:** **Do not use `az login -u <username> -p <password>`.** This legacy Resource Owner Password Credentials (ROPC) flow is highly insecure, fails completely if the user has MFA enabled, and is actively blocked by modern Conditional Access policies. Use Service Principals or Managed Identities instead.
- **Long-Running Background Daemons:** **Do not rely on interactive user logins for 24/7 background tasks.** User refresh tokens have finite lifetimes and are subject to continuous access evaluation (CAE) revocations. Background daemons must authenticate using Managed Identities or certificate-backed Service Principals.

## Alternatives

- **`Connect-AzAccount`:** **Best for PowerShell workflows.** The direct equivalent of `az login` in the Azure PowerShell module (`Az`). It utilizes the same underlying MSAL logic but integrates deeply with PowerShell's native object pipelines and profile contexts.
- **`DefaultAzureCredential`:** **Best for compiled/scripted applications.** A class provided by modern Azure SDKs that attempts multiple authentication methods sequentially (Environment Variables, Managed Identity, Azure CLI cache, Visual Studio cache), abstracting identity management entirely from the developer's code.

## How it works internally

`az login` acts as a wrapper around the Microsoft Authentication Library (MSAL) for Python.

When invoked interactively, it utilizes the OAuth 2.0 Authorization Code Flow with Proof Key for Code Exchange (PKCE). The CLI spins up a temporary web server bound to a randomized port on `localhost` (defaulting to 8400) and opens the user's browser, pointing it to `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`. The request includes a randomly generated `code_challenge`.

Once the user authenticates, Entra ID redirects the browser back to the `localhost` server with an authorization code. The CLI then sends this code, along with the `code_verifier` (the PKCE component to prevent interception attacks), to the token endpoint to exchange it for an Access Token and a Refresh Token.

By default, the CLI queries the Azure Resource Manager (ARM) endpoint (e.g., `https://management.azure.com/`) to retrieve a list of all subscriptions the authenticated identity has access to, saving this mapping locally to generate the command output.

These tokens and subscription contexts are heavily cached. The CLI writes them to `~/.azure/msal_token_cache.json` (the underlying MSAL token store) and `~/.azure/azureProfile.json` (the active subscription context map). Subsequent CLI commands (like `az vm list`) simply read the unexpired Access Token from this local JSON cache and inject it into the `Authorization: Bearer <token>` HTTP header, completely bypassing the authentication process until the token expires (typically 1 hour), at which point the CLI uses the Refresh Token to acquire a new one.

## Performance Notes

- **Token Caching:** `az login` only needs to be run once per session (or until the refresh token expires/is revoked, which can be up to 90 days). You do not need to run `az login` at the top of every bash script; doing so forces a redundant MSAL evaluation and slows down script execution unnecessarily.
- **Web Account Manager (WAM) Integration:** On Windows, recent versions of the Azure CLI broker authentication through the OS-level Web Account Manager (WAM). This dramatically speeds up the login process by leveraging Primary Refresh Tokens (PRTs) tied to the Windows login session, achieving true Single Sign-On (SSO) without launching a browser.

## Security Notes

- **Plaintext Token Storage:** On Linux and older macOS systems, the JWT access and refresh tokens acquired by `az login` are stored in plaintext JSON files within the `~/.azure/` directory. If an attacker gains read access to the local filesystem, they can steal the refresh token and impersonate the user. Treat the `~/.azure` directory with extreme caution.
- **MFA Bypass via Client Secrets:** Authenticating with `az login --service-principal` and a client secret completely bypasses Multifactor Authentication. If a client secret is leaked in a Git repository, it grants immediate, programmatic access to the Azure environment. Always prioritize Certificate-based authentication or OIDC federated tokens for Service Principals.
- **Tenant Isolation:** If you belong to multiple Entra ID tenants, logging into the wrong tenant can expose infrastructure or fail commands silently. Always explicitly state `--tenant` if your account operates across organizational boundaries to avoid accidentally deploying resources to the wrong corporate environment.

## Common Mistakes

- **Forgetting to set the active subscription**
  - _Mistake:_ Running `az login`, seeing a list of 15 subscriptions, and immediately running `az vm create`, which creates the VM in the wrong department's subscription.
  - _Why:_ `az login` defaults the active context to the first subscription returned by the ARM API. You must always run `az account set --subscription <id>` immediately after `az login` to guarantee you are targeting the correct billing boundary.
- **Using standard login for B2B Guest Accounts**
  - _Mistake:_ Running `az login`, authenticating successfully, but receiving a "No subscriptions found" error, even though you were just granted contributor access to a client's subscription.
  - _Why:_ Without the `--tenant` flag, `az login` authenticates you against your _home_ tenant. It does not search external directories. You must explicitly run `az login --tenant <client-tenant-id>` to acquire a token valid for the client's directory.
- **Hardcoding secrets in shell scripts**
  - _Mistake:_ Writing `az login --service-principal -u $USER -p "MySuperSecret123!" --tenant $TENANT` in a bash script.
  - _Why:_ Command-line arguments are stored in plaintext in the shell's `.bash_history` file and are visible to all users on the system via the `ps` command. Always pass secrets via environment variables or native secret managers.

## Best Practices

- **Embrace Managed Identities:** Whenever executing Azure CLI commands from within an Azure compute resource (VM, App Service, AKS), entirely ban the use of Service Principals with secrets. Exclusively use `az login --identity` to eliminate the credential management lifecycle completely.
- **Adopt OIDC for GitHub/GitLab:** Transition all CI/CD pipelines away from storing Azure Client Secrets. Configure Azure AD Federated Identity Credentials and use `az login --federated-token`, which relies on short-lived, cryptographically verified tokens bound strictly to the repository and branch executing the action.
- **Use `az logout` in shared environments:** If using `az login` interactively on a shared bastion host or jumpbox, always execute `az logout` when finished. This actively deletes the cached tokens in `~/.azure`, preventing subsequent users on that host from piggybacking on your authentication context.

## Interview Questions

**Q: What is the fundamental difference in the authentication mechanisms used by `az login --use-device-code` versus the standard `az login`?**
**A:** Standard `az login` uses the OAuth 2.0 Authorization Code flow, requiring the CLI to launch a local web server (localhost:8400) to intercept the callback token from the browser. `--use-device-code` uses the OAuth 2.0 Device Authorization Grant flow, which separates the device requesting access from the device performing the authentication, making it the only option for headless servers without a GUI or local browser.

**Q: You run a script containing `az login --identity` on an on-premises server in your corporate datacenter, but it times out. Why?**
**A:** The `--identity` flag relies on the Azure Instance Metadata Service (IMDS), which is a non-routable endpoint located at `169.254.169.254`. This endpoint only exists within the Azure software-defined networking stack. On-premises servers cannot reach it and must use Azure Arc-enabled server identities or standard Service Principals.

**Q: Why is it considered a severe security risk to use `az login -u <username> -p <password>` for automation?**
**A:** The legacy Resource Owner Password Credentials (ROPC) flow sends the username and password directly to the API. It fundamentally cannot support Multifactor Authentication (MFA), password expirations, or Conditional Access policies that require interactive challenges. It is highly insecure and actively blocked by most modern Microsoft Entra ID baseline security configurations.

## Practice Problems

**Problem:** You are writing a deployment script running via GitHub Actions. You have an OIDC token stored in the environment variable `$GITHUB_TOKEN`. Write the command to log in as a Service Principal (App ID `abcd-1234`) to the tenant `contoso.com` without using a client secret.
**Hint:** Combine the service principal flag with the federated token flag, specifying both the client ID and the tenant.
**Solution:**

```bash
az login --service-principal -u abcd-1234 -t contoso.com --federated-token $GITHUB_TOKEN
```

**Problem:** You are helping a client whose tenant ID is `72f988bf-86f1-41af-91ab-2d7cd011db47`. You need to log in interactively using your personal account, but you must ensure you receive tokens valid for their tenant (where you are a guest) rather than your own home tenant.
**Hint:** Use the interactive login command but override the default directory resolution.
**Solution:**

```bash
az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
```

## References

- [az login - Azure CLI Command Reference](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli)
- [Microsoft Authentication Library (MSAL) overview](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)
- [Workload identity federation with Azure CLI](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
