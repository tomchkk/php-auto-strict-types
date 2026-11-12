SHELL := /bin/bash
.DEFAULT_GOAL := help

# List the available development commands.
.PHONY: help
help:
	@printf '\nPHP Auto Strict Types\n\nUsage: make [target]\n\n'
	@set -o pipefail; \
		awk '\
			/^# / { description = substr($$0, 3); next } \
			/^\.PHONY[[:space:]]*:/ { next } \
			/^[[:alnum:]_.-]+:/ && description != "" { \
				split($$0, target, ":"); \
				printf "%s: %s\n", target[1], description; \
			} \
			{ description = "" } \
		' $(MAKEFILE_LIST) | sort | column -t -s ':'
	@printf '\nTest options (optional)\n'
	@printf '  %-16s %s\n' \
		'VSCODE_VERSION' 'VS Code release, such as 1.146.0' \
		'TEST_FILTER' 'Test name or regular expression' \
		'TEST_TIMEOUT' 'Timeout per test in milliseconds' \
		'TEST_ARGS' 'Additional test-runner flags'
	@printf '\n'

# Install locked development dependencies.
.PHONY: setup
setup:
	npm ci

# Compile the extension and tests.
.PHONY: build
build:
	npm run compile

# Compile automatically when source files change.
.PHONY: watch
watch:
	npm run watch

# Check the extension and test source.
.PHONY: lint
lint:
	npm run lint

# Compile, lint and run integration tests.
.PHONY: test
test: VSCODE_VERSION ?= stable
test: TEST_FILTER ?= .*
test: TEST_TIMEOUT ?= 2000
test: TEST_ARGS ?=
test:
	npm test -- --code-version "$(VSCODE_VERSION)" --grep "$(TEST_FILTER)" --timeout "$(TEST_TIMEOUT)" $(strip $(TEST_ARGS))

# Check dependencies for known vulnerabilities.
.PHONY: audit
audit:
	npm audit

# Build the versioned VSIX in dist/.
.PHONY: package
package:
	mkdir -p dist
	npx --yes @vscode/vsce package --no-dependencies --out dist/

# Build and install the VSIX in VS Code.
.PHONY: install
install: package
	@vsix_path=$$(node -p "'dist/' + require('./package.json').name + '-' + require('./package.json').version + '.vsix'") && \
		code --install-extension "$$vsix_path"
