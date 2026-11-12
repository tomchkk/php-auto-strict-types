import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const varDirectory = fileURLToPath(new URL('./var/', import.meta.url));
const testDirectory = fileURLToPath(new URL('./var/vscode-test/', import.meta.url));
mkdirSync(varDirectory, { recursive: true });

export default defineConfig({
    files: 'build/test/**/*.test.js',
    cachePath: testDirectory,
    launchArgs: [
        `--user-data-dir=${join(testDirectory, 'user-data')}`,
        `--extensions-dir=${join(testDirectory, 'extensions')}`,
    ],
});
