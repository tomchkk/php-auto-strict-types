import * as vscode from 'vscode';
import { sanitizePhpCode } from './php';

const patterns = {
    phpOpeningTag: /^<\?php(?=\s|$)/i,
    leadingWhitespace: /^\s*/,
    declareStatement: /^declare\s*\(([^)]*)\)\s*[;:{]/i,
    strictTypesDirective: /(?:^|,)\s*strict_types\s*=/i,
};

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.workspace.onWillSaveTextDocument((event) => {
        const edits = getStrictTypesEdits(event.document);
        event.waitUntil(Promise.resolve(edits));
    });

    context.subscriptions.push(disposable);
}

function getStrictTypesEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    if (document.languageId !== 'php' || document.uri.scheme !== 'file') {
        return [];
    }

    const text = document.getText();
    const openingTag = patterns.phpOpeningTag.exec(text);

    if (!openingTag) {
        return [];
    }

    const openingTagLength = openingTag[0].length;
    const body = text.slice(openingTagLength);

    const code = sanitizePhpCode(body);

    if (code === undefined || hasStrictTypesDeclaration(code)) {
        return [];
    }

    return [createStrictTypesEdit(document, openingTagLength, body)];
}

// Inspect the header before any executable PHP. Comments and later string
// literals containing declaration text must not suppress the edit.
function hasStrictTypesDeclaration(body: string): boolean {
    let remainingHeader = body;

    while (remainingHeader.length > 0) {
        remainingHeader = remainingHeader.replace(patterns.leadingWhitespace, '');
        const declaration = patterns.declareStatement.exec(remainingHeader);

        if (!declaration) {
            return false;
        }

        const directives = declaration[1];

        if (patterns.strictTypesDirective.test(directives)) {
            return true;
        }

        remainingHeader = remainingHeader.slice(declaration[0].length);
    }
    return false;
}

function createStrictTypesEdit(
    document: vscode.TextDocument,
    openingTagLength: number,
    body: string
): vscode.TextEdit {
    const leadingWhitespace = body.match(patterns.leadingWhitespace)?.[0] ?? '';
    const newline = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const hasFollowingContent = body.length > leadingWhitespace.length;
    const spacingAfterDeclaration = hasFollowingContent ? newline + newline : newline;
    const declaration = newline + newline + 'declare(strict_types=1);' + spacingAfterDeclaration;

    const replacementRange = new vscode.Range(
        document.positionAt(openingTagLength),
        document.positionAt(openingTagLength + leadingWhitespace.length)
    );

    return vscode.TextEdit.replace(replacementRange, declaration);
}

export function deactivate() {}
