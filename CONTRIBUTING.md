# Developing PHP Auto Strict Types

This guide covers local development, testing and packaging for this personal
fork. See [the README](README.md) for extension behaviour and usage.

## Development setup

Run `nvm install` to install and select the Node.js version pinned in `.nvmrc`.
Then install dependencies with `make setup`. The development tools require Node.js
22 or newer.

Run `make` to list the common commands. The Makefile delegates compilation,
lint and tests to the existing npm scripts.

| Command        | Purpose                                       |
| -------------- | --------------------------------------------- |
| `make setup`   | Install the locked dependencies.              |
| `make build`   | Compile the extension and tests.              |
| `make watch`   | Recompile when source files change.           |
| `make lint`    | Check the extension and test source.          |
| `make test`    | Compile, lint and run integration tests.      |
| `make audit`   | Check dependencies for known vulnerabilities. |
| `make package` | Build the versioned VSIX in `dist/`.          |
| `make install` | Build and install the VSIX in VS Code.        |

Optional variables select the VS Code release, filter tests by name or regular
expression, and set the timeout per test in milliseconds. Extra flags can be
passed through `TEST_ARGS`. Defaults are `stable` for the VS Code release, `.*`
for the filter (all tests), and `2000` milliseconds for the timeout.

```sh
make test VSCODE_VERSION=1.146.0 TEST_FILTER='closing-tag' TEST_TIMEOUT=10000 TEST_ARGS='--bail'
```

Press **F5** to compile in watch mode and open an Extension Development Host
window. Set breakpoints in `src/main.ts` to debug the extension there.

```text
src/       Extension TypeScript source
test/      Integration tests
build/     Generated JavaScript, with src/ and test/ subdirectories
dist/      Generated VSIX installers
var/       Downloaded VS Code and isolated test profiles
```

GitHub Actions runs compilation, lint and integration tests on pushes and pull
requests through `make setup` and `make test`, using the Node.js version in
`.nvmrc`. Linux tests run under Xvfb.

The shared `.vscode/` files provide debugging, build tasks and extension
recommendations. Personal `.vscode/settings.json` files are ignored by Git.

## Build and install

Run this from the project directory to create the personal installer.

```sh
make package
```

Run `make install` to build and install the current version, or select
**Extensions > … > Install from VSIX…** in VS Code and choose the installer. Disable the original
`jacovanc.php-auto-strict-types` extension when using this fork.

The package includes the compiled extension, manifest, icon, licence and user
documentation. Source files, tests, editor configuration and older build output
are excluded.

