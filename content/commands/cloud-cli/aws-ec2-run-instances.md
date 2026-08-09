---
slug: aws-ec2-run-instances
name: aws ec2 run-instances
aliases: []
category: cloud-cli
tags: [aws, cloud, ec2, compute, provisioning, instances]
difficulty: intermediate
supportedOS: [linux, macos, windows, unix]
supportedShells: [bash, zsh, powershell, sh]
intentPhrases:
  - 'launch aws ec2 instance'
  - 'create ec2 server'
  - 'provision cloud compute instance'
  - 'start new ec2 virtual machine'
  - 'deploy ec2 instance via cli'
relatedCommands: [aws-ec2-describe-instances, aws-configure, aws-sts-get-caller-identity]
alternatives: []
status: draft
---

## What is it?

`aws ec2 run-instances` is a core AWS CLI command used to launch one or more Amazon Elastic Compute Cloud (EC2) instances. It communicates directly with the EC2 control plane API to provision virtual servers using specified Amazon Machine Images (AMIs), instance types, security groups, storage volumes, and network interfaces.

## Why does it exist?

Provisioning elastic cloud computing resources programmatically requires interacting with low-level REST APIs that demand complex XML serialization, cryptographic SigV4 request signing, and manual parameter encoding. `aws ec2 run-instances` exists to bridge this operational gap, providing a powerful, scriptable command-line interface to instantiate scalable cloud infrastructure reliably for automated deployments, continuous integration build workers, and elastic provisioning workflows.

## Syntax

```bash
aws ec2 run-instances --image-id <value> --instance-type <value> [--count <value>] [--key-name <value>] [--security-group-ids <value>] [--subnet-id <value>] [options]
```

## Flags

| Flag                            | Description                                                                                   | Example                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `--image-id <value>`            | Specifies the Amazon Machine Image (AMI) ID used to bootstrap the instance operating system.  | `aws ec2 run-instances --image-id ami-0abcdef1234567890`                                               |
| `--instance-type <value>`       | Defines the hardware configuration (CPU, memory, storage, network) for the virtual server.    | `aws ec2 run-instances --instance-type t3.medium`                                                      |
| `--count <value>`               | Specifies the number of instances to launch simultaneously from the template configuration.   | `aws ec2 run-instances --count 3`                                                                      |
| `--key-name <value>`            | Assigns an existing EC2 key pair name to enable secure SSH or RDP remote access.              | `aws ec2 run-instances --key-name production-ssh-key`                                                  |
| `--security-group-ids <ids>`    | Associates one or more security group IDs to control inbound and outbound network traffic.    | `aws ec2 run-instances --security-group-ids sg-0123456789abcdef0`                                      |
| `--subnet-id <value>`           | Places the instance interface within a specific VPC subnet, determining its network topology. | `aws ec2 run-instances --subnet-id subnet-0987654321fedcba0`                                           |
| `--user-data <value>`           | Supplies shell scripts or cloud-init configuration metadata executed upon initial boot.       | `aws ec2 run-instances --user-data file://bootstrap.sh`                                                |
| `--tag-specifications <val>`    | Applies resource tags (key-value metadata) to instances and volumes during provisioning.      | `aws ec2 run-instances --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer}]'` |
| `--iam-instance-profile <val>`  | Attaches an IAM role profile to the instance, granting secure temporary AWS API credentials.  | `aws ec2 run-instances --iam-instance-profile Name=S3AccessRole`                                       |
| `--block-device-mappings <val>` | Customizes EBS storage volume sizes, encryption keys, and deletion policies.                  | `aws ec2 run-instances --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50}}]'` |
| `--associate-public-ip-address` | Explicitly assigns a public IPv4 address to instances launched within a public VPC subnet.    | `aws ec2 run-instances --associate-public-ip-address`                                                  |

## Examples

```bash
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t2.micro
```

> This launches a single basic `t2.micro` instance using the specified Amazon Linux AMI in your default VPC subnet and region, returning a full JSON reservation object describing the new server.

```bash
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.small --key-name my-ssh-key --security-group-ids sg-0123456789abcdef0
```

> This provisions an instance while explicitly attaching a pre-configured SSH key pair (`my-ssh-key`) and network firewall security group, ensuring secure remote administrative access upon boot.

```bash
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type c5.xlarge --count 3
```

> This uses the `--count` flag to instruct the EC2 control plane to provision three identical compute-optimized virtual servers simultaneously in a single API operation.

```bash
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.medium --user-data file://setup.sh --associate-public-ip-address
```

> This provisions an instance with a public IP address and injects a local shell script (`setup.sh`) via cloud-init user-data, automating application installation immediately upon server startup.

```bash
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type m5.large --tag-specifications 'ResourceType=instance,Tags=[{Key=Environment,Value=Production},{Key=Owner,Value=DevOps}]'
```

> This launches a production instance and applies structured resource tags directly during creation, ensuring compliance with corporate governance and tagging policies from the moment of birth.

## Real-World Scenarios

**Automating CI/CD Build Worker Provisioning**

```bash
aws ec2 run-instances --image-id ami-0123456789abcdef0 --instance-type c6i.2xlarge --subnet-id subnet-builds --tag-specifications 'ResourceType=instance,Tags=[{Key=Role,Value=BuildWorker}]'
```

> Continuous integration orchestration systems use dynamic `run-instances` calls to spin up high-performance, ephemeral compute workers on demand to compile heavy codebases, terminating the instances automatically once the build completes.

**Bootstrapping Scalable Web Application Clusters**

```bash
aws ec2 run-instances --image-id ami-0123456789abcdef0 --instance-type t3.large --count 2 --security-group-ids sg-web --user-data file://nginx-init.sh
```

> Infrastructure administrators deploying redundant multi-instance web fleets use this command to provision mirrored servers across different availability zones, injecting configuration scripts to bootstrap Nginx instantly.

**Deploying Ephemeral Test Environments for QA**

```bash
aws ec2 run-instances --image-id ami-0123456789abcdef0 --instance-type t3.medium --subnet-id subnet-qa --iam-instance-profile Name=QARole
```

> Quality assurance teams write automated test harness scripts that invoke `run-instances` to provision clean, isolated staging environments loaded with precise IAM roles for end-to-end integration testing.

## When should it NOT be used?

- **Managing declarative production infrastructure state:** Using manual CLI run-instances commands for persistent production systems. **Reason:** Direct CLI provisioning lacks version-controlled state tracking, making infrastructure drift hard to audit and reproduce. **Use instead:** Terraform or AWS CloudFormation for declarative infrastructure-as-code management.
- **Deploying complex multi-tier microservice architectures:** Launching databases, load balancers, and app servers individually via CLI. **Reason:** Manual sequential provisioning creates race conditions and fragmented dependency graphs. **Use instead:** AWS CDK, CloudFormation templates, or container orchestration platforms like ECS and EKS.
- **Running long-lived static infrastructure without configuration management:** Launching bare servers and configuring them manually via SSH. **Reason:** Snowflake servers become impossible to rebuild reliably if hardware fails. **Use instead:** Pre-baked golden AMIs combined with automated user-data initialization scripts.

## Alternatives

- **Terraform (HashiCorp):** An open-source declarative infrastructure-as-code tool. **Tradeoff:** Terraform introduces state management files, execution plans, and multi-cloud support, requiring an external toolchain setup, whereas `aws ec2 run-instances` is a native, immediate CLI command requiring zero configuration.
- **AWS CloudFormation:** Native AWS infrastructure management service. **Tradeoff:** CloudFormation templates require writing verbose YAML or JSON and managing stack updates, but provide built-in stack rollbacks, dependency resolution, and managed change sets.

## How it works internally

When you execute `aws ec2 run-instances`, the AWS CLI translates your parameters into a signed HTTPS request targeting the regional `ec2.<region>.amazonaws.com` control plane endpoint using **Signature Version 4 (SigV4)**.

Upon receiving the request, the EC2 control plane authenticates your IAM permissions (`ec2:RunInstances`) and validates quota limits (such as vCPU limits per instance family). It then allocates hardware resources on the underlying virtualization hypervisor (such as AWS Nitro or Xen). Concurrently, it allocates an **Elastic Block Store (EBS)** root volume by pulling the snapshot layers defined by your `--image-id` AMI, decrypts and attaches the volume, assigns private and optional public IP addresses via the VPC DHCP service, and injects your `--user-data` payload into the local instance metadata service (IMDS).

The EC2 service packages the response into a structured JSON reservation object and returns it to your terminal. The instance transitions rapidly from `pending` to `running` state. The command returns an exit code of `0` upon successful API request acceptance, or a non-zero error code if validation fails.

## Performance Notes

- Launching large fleets of instances simultaneously (`--count 50`) can saturate local client CPU and network socket pools if requests are unmanaged, though the EC2 control plane handles backend scheduling efficiently.
- Instance startup latency is heavily influenced by AMI size (larger root volumes take longer to initialize from EBS snapshots) and the complexity of initialization tasks bundled inside `--user-data` boot scripts.

## Security Notes

- **IAM Least Privilege Enforcement:** The executing IAM principal must hold explicit `ec2:RunInstances`, `iam:PassRole`, and `ec2:CreateTags` permissions. Overly broad wildcard permissions allow malicious actors to spawn unauthorized crypto-mining fleets.
- **Security Group Misconfiguration:** Launching instances with overly permissive security groups (`0.0.0.0/0` on port 22 or 3389) exposes virtual machines to immediate brute-force attacks across the public internet.
- **Secret Leakage via User Data:** Passing plaintext database passwords or API tokens inside `--user-data` scripts embeds those secrets into the instance metadata service (IMDS), where any local process or container running on the instance can read them.

## Common Mistakes

- **Omitting subnet selection in custom VPCs:** Running `run-instances` without `--subnet-id` in an account with no default VPC. **Why it's wrong:** The API call fails instantly with a missing subnet error because EC2 cannot determine which network boundary or availability zone to provision the server into.
- **Confusing AMI IDs across regions:** Using an AMI ID from `us-east-1` when running the command in `us-west-2`. **Why it's wrong:** AMIs are strictly regional assets. Attempting to launch an instance with a cross-region AMI ID results in a `InvalidAMIID.NotFound` error.
- **Failing to associate public IPs in public subnets:** Launching an instance in a public subnet without `--associate-public-ip-address` when the subnet setting is disabled. **Why it's wrong:** The instance provisions successfully but lacks an external IP address, making it completely unreachable via SSH from the internet.

## Best Practices

- Always include explicit `--tag-specifications` during launch to ensure compute resources inherit proper ownership, environment, and cost-allocation tags immediately.
- Leverage pre-baked "golden AMIs" (created via Packer) combined with minimal lightweight `--user-data` scripts to accelerate instance boot times and ensure configuration consistency.
- Never pass plaintext secrets in command-line flags or user-data scripts; instead, attach an IAM instance profile and fetch secrets securely at runtime from AWS Secrets Manager or Parameter Store.

## Interview Questions

**Q:** What is the technical difference between the API request acceptance state returned by `aws ec2 run-instances` and the actual operational readiness of the virtual machine?
**A:** `aws ec2 run-instances` returns a reservation object indicating that the EC2 control plane has successfully accepted the provisioning request and allocated hypervisor resources (`pending` state). However, operational readiness requires time for the EBS root volume to attach, the operating system kernel to boot, network interfaces to initialize, and cloud-init `--user-data` scripts to finish executing.

**Q:** Why does launching an EC2 instance require an IAM role to have `iam:PassRole` permissions when you specify `--iam-instance-profile`?
**A:** The `iam:PassRole` permission is a critical security safeguard designed to prevent privilege escalation. It ensures that an IAM user or role cannot attach a powerful administrative role (such as AdministratorAccess) to a newly spawned EC2 instance unless they have explicit authorization to "pass" that specific role to the compute service.

**Q:** How does Amazon EC2 handle root volume provisioning when you execute `run-instances`, and where are the AMI image layers stored prior to boot?
**A:** Amazon Machine Images (AMIs) are backed by snapshots stored persistently in Amazon S3. When `run-instances` is executed, the EC2 control plane provisions a new Amazon Elastic Block Store (EBS) volume and populates its blocks from the S3-backed AMI snapshot layers, attaching the resulting volume directly to the virtual machine as the root device (`/dev/xvda` or similar).

## Practice Problems

**Problem:** Launch a single `t3.medium` instance in the default region using AMI ID `ami-0c55b159cbfafe1f0`, attaching a security group ID `sg-0123456789abcdef0` and applying a tag where `Name` equals `AppServer`.
**Hint:** Combine the image ID, instance type, security group ID, and tag specification flags.
**Solution:** `aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.medium --security-group-ids sg-0123456789abcdef0 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=AppServer}]'` (This provisions the server with specific networking and resource metadata).

**Problem:** Provision two identical `t3.small` instances in a specific subnet (`subnet-0987654321fedcba0`) while assigning a public IP address to both.
**Hint:** Combine the count flag, subnet ID flag, and public IP association flag.
**Solution:** `aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.small --count 2 --subnet-id subnet-0987654321fedcba0 --associate-public-ip-address` (This launches multiple servers inside the designated subnet with external connectivity).

## References

- [AWS CLI Command Reference - ec2 run-instances](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/run-instances.html)
- [Amazon EC2 API Reference - RunInstances](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html)
