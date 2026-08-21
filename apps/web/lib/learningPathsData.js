export const STATIC_PATHS = {
  'linux-fundamentals': {
    slug: 'linux-fundamentals',
    title: 'Linux Fundamentals for DevOps',
    category: 'linux',
    difficulty: 'beginner',
    description:
      'Master essential Linux terminal navigation, file permissions, and process management.',
    steps: [
      {
        title: 'File System Navigation',
        description: 'Learn cd, ls, pwd, and directory hierarchy.',
        commandSlug: 'ls',
      },
      {
        title: 'Text Searching with Grep',
        description: 'Master pattern matching across server logs.',
        commandSlug: 'grep',
      },
      {
        title: 'File Permissions & Ownership',
        description: 'Understand chmod, chown, and octal security masks.',
        commandSlug: 'chmod',
      },
    ],
  },
  'git-mastery': {
    slug: 'git-mastery',
    title: 'Git Version Control Mastery',
    category: 'git',
    difficulty: 'intermediate',
    description:
      'Step-by-step guide to repository initialization, branching workflows, and commit history manipulation.',
    steps: [
      {
        title: 'Repository Initialization',
        description: 'Initialize new projects and configure local git defaults.',
        commandSlug: 'git-init',
      },
      {
        title: 'Staging & Commits',
        description: 'Stage changes selectively and craft atomic commit messages.',
        commandSlug: 'git-commit',
      },
      {
        title: 'Branching Strategy',
        description: 'Create, switch, and merge feature branches safely.',
        commandSlug: 'git-branch',
      },
      {
        title: 'History Inspection',
        description: 'Analyze commit logs, diffs, and historical changes.',
        commandSlug: 'git-log',
      },
    ],
  },
  'docker-foundations': {
    slug: 'docker-foundations',
    title: 'Docker & Container Foundations',
    category: 'docker',
    difficulty: 'beginner',
    description:
      'Learn core containerization principles, image building, and container runtime inspection.',
    steps: [
      {
        title: 'Running Containers',
        description: 'Execute isolated applications in ephemeral containers.',
        commandSlug: 'docker-run',
      },
      {
        title: 'Building Custom Images',
        description: 'Compile OCI images from standard Dockerfiles.',
        commandSlug: 'docker-build',
      },
      {
        title: 'Multi-Container Orchestration',
        description: 'Manage multi-service stacks with docker-compose.',
        commandSlug: 'docker-compose',
      },
      {
        title: 'Container Logs & Debugging',
        description: 'Inspect live application logs and inspect running states.',
        commandSlug: 'docker-logs',
      },
    ],
  },
  'networking-essentials': {
    slug: 'networking-essentials',
    title: 'Linux Networking & SSH Security',
    category: 'networking',
    difficulty: 'intermediate',
    description:
      'Diagnose network connections, socket bindings, remote server access, and DNS queries.',
    steps: [
      {
        title: 'Interface Inspection',
        description: 'Inspect IP addresses, link states, and network routing.',
        commandSlug: 'ip',
      },
      {
        title: 'Socket Statistics',
        description: 'Identify listening ports and active socket connections.',
        commandSlug: 'ss',
      },
      {
        title: 'Secure Remote Shell Access',
        description: 'Connect securely to remote Linux servers using SSH keypairs.',
        commandSlug: 'ssh',
      },
      {
        title: 'DNS Resolution Diagnostics',
        description: 'Query DNS record sets and diagnose domain resolution issues.',
        commandSlug: 'dig',
      },
    ],
  },
};
