# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report privately through GitHub: [https://github.com/ArbabNaseer82/try-it-on/security/advisories/new](https://github.com/ArbabNaseer82/try-it-on/security/advisories/new). Include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- affected package and version.

You will get an acknowledgement within 72 hours and a fix or mitigation plan as soon as possible.

## Scope notes

- TryOnIt processes camera frames on the device. A report showing that frames, landmarks or captures are sent anywhere without the integrator's code doing so is a high severity issue.
- Asset manifests are validated and `javascript:` URLs are rejected. Integrators must still only load manifests and models from sources they trust.
