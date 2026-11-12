const patterns = {
    identifier: /^[\w\u0080-\uffff]+/,
    lineComment: /^(?:\/\/|#)[^\r\n]*/,
    heredocStart: /^<<<[\t ]*(?:'([a-zA-Z_\u0080-\uffff][\w\u0080-\uffff]*)'|"([a-zA-Z_\u0080-\uffff][\w\u0080-\uffff]*)"|([a-zA-Z_\u0080-\uffff][\w\u0080-\uffff]*))\r?\n/,
};

type PhpToken = { end: number; code: string };

// Keep executable syntax for the header check. Replace comments with whitespace
// and string values with placeholders so their contents cannot become PHP syntax.
// A closing tag or unfinished token makes the document unsuitable for an edit.
export function sanitizePhpCode(text: string): string | undefined {
    const code: string[] = [];
    let offset = 0;

    while (offset < text.length) {
        const token = readPhpToken(text, offset);
        if (!token) {
            return undefined;
        }
        code.push(token.code);
        offset = token.end;
    }

    return code.join('');
}

function readPhpToken(text: string, offset: number): PhpToken | undefined {
    if (text.startsWith('?>', offset)) {
        return undefined;
    }

    if (text.startsWith('/*', offset)) {
        const end = text.indexOf('*/', offset + 2);
        return end === -1 ? undefined : { end: end + 2, code: ' ' };
    }

    const character = text[offset];
    if (text.startsWith('//', offset) || (character === '#' && text[offset + 1] !== '[')) {
        const comment = text.slice(offset).match(patterns.lineComment)![0];
        // PHP closing tags also terminate single-line comments.
        return comment.includes('?>') ? undefined : { end: offset + comment.length, code: ' ' };
    }

    if (character === "'" || character === '"' || character === '`') {
        const end = findQuotedStringEnd(text, offset);
        return end === undefined ? undefined : { end, code: '0' };
    }

    if (text.startsWith('<<<', offset)) {
        const end = findHeredocEnd(text, offset);
        return end === undefined ? undefined : { end, code: '0' };
    }

    const code = text.slice(offset).match(patterns.identifier)?.[0] ?? character;
    return { end: offset + code.length, code };
}

function findQuotedStringEnd(text: string, start: number): number | undefined {
    const quote = text[start];
    let offset = start + 1;

    while (offset < text.length) {
        const character = text[offset];
        if (character === '\\') {
            offset += 2;
            continue;
        }
        if (character === quote) {
            return offset + 1;
        }

        const hasInterpolation = quote !== "'" && (
            (character === '{' && text[offset + 1] === '$') ||
            (character === '$' && text[offset + 1] === '{')
        );
        if (hasInterpolation) {
            const braceOffset = character === '{' ? offset : offset + 1;
            const end = findInterpolationEnd(text, braceOffset);
            if (end === undefined) {
                return undefined;
            }
            offset = end;
            continue;
        }
        offset++;
    }
    return undefined;
}

function findInterpolationEnd(text: string, start: number): number | undefined {
    let depth = 1;
    let offset = start + 1;

    while (offset < text.length) {
        const token = readPhpToken(text, offset);
        if (!token) {
            return undefined;
        }
        if (token.code === '{') {
            depth++;
        }
        if (token.code === '}') {
            depth--;
            if (depth === 0) {
                return token.end;
            }
        }
        offset = token.end;
    }
    return undefined;
}

function findHeredocEnd(text: string, start: number): number | undefined {
    const opening = text.slice(start).match(patterns.heredocStart);
    if (!opening) {
        return undefined;
    }

    const label = opening[1] ?? opening[2] ?? opening[3];
    const closingPattern = new RegExp('^[\\t ]*' + label + '(?![\\w\\u0080-\\uffff])', 'my');
    const isNowdoc = opening[1] !== undefined;
    let offset = start + opening[0].length;

    while (offset < text.length) {
        closingPattern.lastIndex = offset;
        const closing = closingPattern.exec(text);
        if (closing) {
            return offset + closing[0].length;
        }

        const character = text[offset];
        if (!isNowdoc && character === '\\') {
            offset += 2;
            continue;
        }
        const hasInterpolation = !isNowdoc && (
            (character === '{' && text[offset + 1] === '$') ||
            (character === '$' && text[offset + 1] === '{')
        );
        if (hasInterpolation) {
            const braceOffset = character === '{' ? offset : offset + 1;
            const end = findInterpolationEnd(text, braceOffset);
            if (end === undefined) {
                return undefined;
            }
            offset = end;
            continue;
        }
        offset++;
    }
    return undefined;
}
