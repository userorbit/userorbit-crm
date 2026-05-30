# Security

## Supported versions

The `main` branch is the supported version for this early open-source release.

## Reporting a vulnerability

Please report security issues privately to the repository owner before public disclosure. Include:

- Affected endpoint or workflow.
- Reproduction steps.
- Expected impact.
- Any relevant logs with secrets removed.

## Self-hosting notes

- Set a long random `CRM_API_TOKEN`; it is the bootstrap admin credential.
- Create workspace-scoped agent tokens for automations instead of reusing the bootstrap token.
- Keep `.dev.vars` out of Git.
- Rotate SMTP credentials if they are exposed.
- Review Cloudflare Worker logs before sharing them because outbound email failures can include provider details.
