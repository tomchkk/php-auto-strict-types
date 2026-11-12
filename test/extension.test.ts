import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Auto strict types on save', () => {
    let directory: string;
    let fileNumber = 0;

    suiteSetup(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'php-auto-strict-types-test-'));
        const extension = vscode.extensions.getExtension('tomchkk.php-auto-strict-types');
        assert.ok(extension, 'The personal extension must be loaded');
        await extension.activate();
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await fs.rm(directory, { recursive: true, force: true });
    });

    async function saveFile(input: string, expected: string, suffix = '.php') {
        const filename = path.join(directory, `${++fileNumber}${suffix}`);
        await fs.writeFile(filename, input + ' ');
        const document = await vscode.workspace.openTextDocument(filename);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(new vscode.Position(0, 0), document.positionAt(document.getText().length)),
            input
        );
        assert.strictEqual(await vscode.workspace.applyEdit(edit), true);

        let saveCount = 0;
        const listener = vscode.workspace.onDidSaveTextDocument((saved) => {
            if (saved.uri.toString() === document.uri.toString()) {
                saveCount++;
            }
        });
        try {
            assert.strictEqual(await document.save(), true);
            assert.strictEqual(document.getText(), expected);
            assert.strictEqual(await fs.readFile(filename, 'utf8'), expected);
            assert.strictEqual(document.isDirty, false);
            assert.strictEqual(saveCount, 1, 'The edit must be included in the original save');
        } finally {
            listener.dispose();
        }
    }

    const existingDeclarations = [
        'declare(strict_types=1);',
        'declare /* setting */ (strict_types=1);',
        'declare /* setting */ (strict_types=0);',
        'declare(strict_types /* note (example) */ = 1);',
        'declare(strict_types=1) /* punctuation ) */ ;',
        'declare // setting\n(strict_types=1);',
        'declare(strict_types # setting\n = 0);',
        'declare(strict_types = 1);',
        'declare ( strict_types\n =\t1 );',
        'declare(strict_types=0);',
        'declare(strict_types /* explicit setting */ = 1);',
        '/* File header */\n// Description\n# More context\ndeclare(strict_types = 1);',
        'declare(ticks=1);\ndeclare(strict_types = 1);'
    ];
    for (const declaration of existingDeclarations) {
        test(`preserves an existing declaration: ${JSON.stringify(declaration)}`, async () => {
            const text = `<?php\n\n${declaration}\n`;
            await saveFile(text, text);
        });
    }

    const unsupportedFiles = [
        '',
        'plain text',
        '<html><?php echo 1;',
        '\n<?php\necho 1;',
        '<?php echo 1; ?>HTML',
        '<?php\necho 1;\n?>',
        '<?phpish echo 1;',
        '<?php // closing tag ?>HTML',
        '<?php # closing tag ?>HTML',
        '<?php echo "?>"; ?>HTML',
        '<?php /* unfinished comment',
        "<?php echo 'unfinished string",
        '<?php $text = <<<TEXT\nunfinished heredoc'
    ];
    for (const text of unsupportedFiles) {
        test(`skips an unsupported PHP file: ${JSON.stringify(text)}`, async () => {
            await saveFile(text, text);
        });
    }

    test('skips another language', async () => {
        await saveFile('<?php\necho 1;', '<?php\necho 1;', '.txt');
    });

    const newDeclarations = [
        ['<?php\n\nnamespace App;\n', '<?php\n\ndeclare(strict_types=1);\n\nnamespace App;\n'],
        ['<?php namespace App;', '<?php\n\ndeclare(strict_types=1);\n\nnamespace App;'],
        ['<?php\necho 1;', '<?php\n\ndeclare(strict_types=1);\n\necho 1;'],
        ['<?php', '<?php\n\ndeclare(strict_types=1);\n'],
        ['<?php\n\n', '<?php\n\ndeclare(strict_types=1);\n'],
        ['<?PHP\necho 1;', '<?PHP\n\ndeclare(strict_types=1);\n\necho 1;'],
        ['<?php\r\n\r\nnamespace App;\r\n', '<?php\r\n\r\ndeclare(strict_types=1);\r\n\r\nnamespace App;\r\n'],
        ['<?php\n// declare(strict_types=1);\necho 1;', '<?php\n\ndeclare(strict_types=1);\n\n// declare(strict_types=1);\necho 1;'],
        ["<?php\n$value = 'declare(strict_types=1);';", "<?php\n\ndeclare(strict_types=1);\n\n$value = 'declare(strict_types=1);';"]
    ];
    for (const [input, expected] of newDeclarations) {
        test(`formats a new declaration: ${JSON.stringify(input)}`, async () => {
            await saveFile(input, expected);
        });
    }

    const literalClosingTags = [
        "echo '?>';",
        'echo "?>";',
        'echo "escaped \\" ?>";',
        "echo 'escaped \\' ?>';",
        'echo `printf "?>"`;',
        '/* closing tag ?> and parentheses ) */\necho 1;',
        'echo "{$values["?>"]}";',
        'echo "${values[\'?>\']}";',
        '$text = <<<TEXT\n" \' ?>\nTEXT;',
        '$text = <<<"TEXT"\n?>\nTEXT;',
        "$text = <<<'TEXT'\n\" ' ?>\nTEXT;",
        '$text = <<<TEXT\n  ?>\n  TEXTsuffix\n  TEXT;',
        '$text = <<<TEXT\r\n?>\r\nTEXT;',
        '$text = <<<TEXT\n{$values["line\nTEXT\n?>"]}\nTEXT;',
        '#[Example("?>")]\nclass Example {}'
    ];
    for (const body of literalClosingTags) {
        test(`adds a declaration around literal closing-tag text: ${JSON.stringify(body)}`, async () => {
            const newline = body.includes('\r\n') ? '\r\n' : '\n';
            const input = `<?php${newline}${newline}${body}${newline}`;
            const expected = `<?php${newline}${newline}declare(strict_types=1);${newline}${newline}${body}${newline}`;
            await saveFile(input, expected);
        });
    }

    test('keeps the declaration unchanged on a later save', async () => {
        const filename = path.join(directory, `${++fileNumber}.php`);
        const original = '<?php\n\ndeclare(strict_types=1);\n\necho 1;\n';
        await fs.writeFile(filename, original);
        const document = await vscode.workspace.openTextDocument(filename);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, document.positionAt(original.length), 'echo 2;\n');
        assert.strictEqual(await vscode.workspace.applyEdit(edit), true);
        assert.strictEqual(await document.save(), true);
        assert.strictEqual(await fs.readFile(filename, 'utf8'), original + 'echo 2;\n');
    });
});
