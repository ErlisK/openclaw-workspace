# @teachrepo/cli

The TeachRepo command-line interface. Lets creators work entirely locally with Git-native workflows.

## Commands

```bash
# Initialize a new course from a GitHub repo or local folder
teachrepo init [repo-url|path]

# Preview your course locally
teachrepo dev

# Validate course structure and quiz YAML
teachrepo validate

# Build static assets
teachrepo build

# Publish to TeachRepo (requires auth)
teachrepo publish

# Generate a quiz from a lesson using AI
teachrepo quiz generate lessons/01-intro.md

# Show course stats
teachrepo stats
```

## Installation

```bash
npm install -g @teachrepo/cli
```
