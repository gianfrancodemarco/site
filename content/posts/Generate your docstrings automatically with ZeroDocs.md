---
title: "Generate your docstrings automatically with ZeroDocs"
date:  2024-02-12T15:30:00
draft:  false
tags: ["AI", "Python", "CI/CD", "LLM"]
type: "post"
truncated: true
summary: ZeroDocs is a tool that uses OpenAI's APIs to automatically generate docstrings for Python projects and create pull requests with the changes, integrating easily with GitHub Actions.
image: /images/posts/Generate_your_docstrings_automatically_with_ZeroDocs/hero.jpg
showTableOfContents: true
---

# Introduction

Your Python project is finally stable; it is more or less working, and you see no major refactors ahead.
Now it is time to write your documentation. You can easily generate it from your docstrings...but you never wrote them down, since the code was changing so quickly.


Bored and beaten, you embrace this hours-long journey to start filling in those blanks.
Or, well, you can use [**ZeroDocs**](https://github.com/gianfrancodemarco/zero-docs)!

**ZeroDocs** is a simple tool that leverages OpenAI's APIs to automatically generate docstrings for your modules, classes and functions, and open a PR with all of the suggested changes.
It comes with a Github Action, so it requires almost no setup time.

<br>

# Examples

Following there are some examples setups.

## Example 1: Generate Documentation for specific folders or files
With this configuration, the ZeroDocs action will take the folders or files to scan as input from the UI and generate documentation for them.

```yaml
name: Auto Doc Generation

on:
  workflow_dispatch:
    inputs:
      paths:
        type: string
        description: "Space separated list of directories and/or files to scan"
      code-entities:
        description: "List of code entities to generate docstrings for"
        required: false
        default: "module,class,function"

jobs:
  auto_doc_generation:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Docs
        uses: gianfrancodemarco/ZeroDocs@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          paths: ${{ github.event.inputs.paths }}
          reviewers: gianfrancodemarco
```

![Github action UI](/images/posts/Generate_your_docstrings_automatically_with_ZeroDocs/ci.png)

## Example 2: Generate Documentation for modified files in a pull request

```yaml
name: Auto Doc Generation

on:
  push:
    branches:
      - main

jobs:
  fetch_files:
    runs-on: ubuntu-latest
    outputs:
      files: ${{ steps.changed-files.outputs.all_changed_files }}
    steps:

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # OR "2" -> To retrieve the preceding commit.

      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v42
        with:
          since_last_remote_commit: true 

      - name: List all changed files
        env:
          ALL_CHANGED_FILES: ${{ steps.changed-files.outputs.all_changed_files }}
        run: |
          for file in ${ALL_CHANGED_FILES}; do
            echo "$file was changed"
          done

  auto_doc_generation_only_modified_files:
    runs-on: ubuntu-latest
    needs: fetch_files
    steps:
      - name: Generate Docs
        uses: gianfrancodemarco/ZeroDocs@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          paths: ${{ needs.fetch_files.outputs.files }}
          reviewers: gianfrancodemarco

```

# Customization

There are some parameters that can be customized (and more to come!):

| Name            | Description                               | Required | Default Value |
|-----------------|-------------------------------------------|----------|---------------|
| openai-api-key  | API key for OpenAI                        | true     | -             |
| reviewers       | A comma or newline-separated list of reviewers (GitHub usernames) to request a review from. (via [create-pull-request](https://github.com/peter-evans/create-pull-request))    | false    | -
| paths           | **Space** separated list of directories and/or files to scan | true     | . (root)     |
| code-entities   | Comma separated list of code entities to generate docstrings for | false    | module,class,function |
| prompt          | Prompt to use for generating docstrings   | false    | (in source code)             |

# Conclusions

ZeroDocs can be a useful tool to start documenting your code, not having to start from a blank page.
Will you try it? 