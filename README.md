# @freelensapp/kamaji-extension

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![GitHub](https://img.shields.io/github/stars/freelensapp/freelens?style=flat&label=GitHub%20%E2%AD%90)](https://github.com/freelensapp/freelens)
[![Release](https://img.shields.io/github/v/release/freelensapp/freelens-kamaji-extension?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens-kamaji-extension)
[![Integration tests](https://github.com/freelensapp/freelens-kamaji-extension/actions/workflows/integration-tests.yaml/badge.svg?branch=main)](https://github.com/freelensapp/freelens-kamaji-extension/actions/workflows/integration-tests.yaml)
[![npm](https://img.shields.io/npm/v/@freelensapp/kamaji-extension.svg)](https://www.npmjs.com/package/@freelensapp/kamaji-extension)

<!-- markdownlint-enable MD013 -->

This is the repository for the [Freelens](https://freelens.app) extension for [Kamaji](https://kamaji.clastix.io).

# :rocket: How to build the extension
```bash
pnpm setup
```

Reload all terminals on your machine.

Then run

```bash
pnpm install -g node-gyp
pnpm install
```

Build the extension
```bash
pnpm build
pnpm pack
```

## License

Copyright (c) 2025 Freelens Authors.

[MIT License](https://opensource.org/licenses/MIT)
