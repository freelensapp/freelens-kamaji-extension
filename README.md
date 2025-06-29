# @freelensapp/kamaji-extension

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![GitHub](https://img.shields.io/github/stars/freelensapp/freelens?style=flat&label=GitHub%20%E2%AD%90)](https://github.com/freelensapp/freelens)
[![Release](https://img.shields.io/github/v/release/freelensapp/freelens-kamaji-extension?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens-kamaji-extension)
[![Integration tests](https://github.com/freelensapp/freelens-kamaji-extension/actions/workflows/integration-tests.yaml/badge.svg?branch=main)](https://github.com/freelensapp/freelens-kamaji-extension/actions/workflows/integration-tests.yaml)
[![npm](https://img.shields.io/npm/v/@freelensapp/kamaji-extension.svg)](https://www.npmjs.com/package/@freelensapp/kamaji-extension)

<!-- markdownlint-enable MD013 -->

This is the repository for the [Freelens](https://freelens.app) extension for [Kamaji](https://kamaji.clastix.io).

## **[ WARNING: This repository has just been initialized and is a work in progress. ]**

## Requirements

- Kubernetes >= 1.24
- Freelens >= 1.3.2

## API supported

- kamaji.freelens.app/v1alpha1

To install Custom Resource Definition for this Kamaji run:

```sh
kubectl apply -f examples/crds/customresourcedefinition.yaml
```

Examples provide a resource for test:

```sh
kubectl apply -f examples/test/example.yaml
```

## Install

To install open Freelens and go to Extensions (`ctrl`+`shift`+`E` or
`cmd`+`shift`+`E`), and install `@freelensapp/kamaji-extension`.

or:

Use a following URL in the browser:
[freelens://app/extensions/install/%40freelensapp%2Fkamaji-extension](freelens://app/extensions/install/%40freelensapp%2Fkamaji-extension)

## Build from the source

You can build the extension using this repository.

### Prerequisites

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) or
[windows-nvm](https://github.com/coreybutler/nvm-windows) to install the
required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise install
# or
winget install CoreyButler.NVMforWindows
nvm install 22.15.1
nvm use 22.15.1
```

Install Pnpm:

```sh
corepack install
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
# or
winget install pnpm.pnpm
```

### Build extension

```sh
pnpm i
pnpm build
pnpm pack
```

### Install built extension

The tarball for the extension will be placed in the current directory. In
Freelens, navigate to the Extensions list and provide the path to the tarball
to be loaded, or drag and drop the extension tarball into the Freelens window.
After loading for a moment, the extension should appear in the list of enabled
extensions.

## License

Copyright (c) 2025 Freelens Authors.

[MIT License](https://opensource.org/licenses/MIT)
