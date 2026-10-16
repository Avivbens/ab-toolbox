# Contributing to ab-toolbox

Thank you for your interest in contributing to ab-toolbox!  
We welcome contributions from the community, whether you're reporting bugs, suggesting enhancements, or submitting code improvements.

> **Note:** Please review our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our expectations for participant behavior.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Adding a New Package](#adding-a-new-package)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Pull Requests](#pull-requests)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Additional Resources](#additional-resources)

---

## How to Contribute

To get started, follow these steps:

1. Fork the repository
1. Clone your forked repository
1. Install dependencies with `pnpm install --frozen-lockfile`
1. Make changes
1. Test your changes
1. Submit a pull request against the `master` branch 🎉

## Adding a New Package

Every package lives in `projects/libs/<name>` and is published as `@ab-toolbox/<name>`. Generate one with:

```bash
pnpm exec nx g @ab-toolbox/workspace:generate-lib <name>
```

The generator creates a publishable ESM package with build, test, lint and typecheck targets wired up.

---

## Reporting Issues

Before reporting a new issue, please search the issue tracker to see if it has already been reported. When filing an issue, please include:

- A clear and descriptive title.
- A detailed description of the problem.
- Steps to reproduce the issue.
- Expected behavior versus actual behavior.
- Any relevant logs or screenshots.

---

## Feature Requests

We’re always open to new ideas that can help improve ab-toolbox. If you have an idea for a new tool or an enhancement:

- Open a new issue and label it as a "feature request".
- Provide a clear description of the feature and its benefits.
- If applicable, explain how it aligns with the overall vision of ab-toolbox.

---

## Pull Requests

When you’re ready to submit your changes, follow these guidelines:

1. **Create a Branch:** Branch off from `master` with a descriptive name.
1. **Commit Changes:** Make atomic commits with clear commit messages (see guidelines below).
1. **Push and Open a PR:** Push your branch to your fork and open a pull request against the `master` branch.
1. **Describe Your Changes:** Include a summary of the changes, motivation, and any relevant issue numbers.
1. **Review Process:** Your pull request will be reviewed by a maintainer. You may be asked to make additional changes before it can be merged.

---

## Commit Message Guidelines

We use `nx release` to version and publish each package independently, based on its commit messages. Please follow these commit message conventions:

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (formatting, etc.)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **test:** Adding missing tests or correcting existing tests
- **chore:** Changes to the build process or auxiliary tools and libraries
- For breaking changes, add a `BREAKING CHANGE` section to the commit message body:

```git
feat: <description>

BREAKING CHANGE: <description>
```

Each commit message should be clear and follow the structure of a [Conventional Commits](https://www.conventionalcommits.org/) message.

---

## Additional Resources

- [Nx Documentation](https://nx.dev)
- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Conventional Commits](https://www.conventionalcommits.org/)

Thank you for helping make ab-toolbox better!
