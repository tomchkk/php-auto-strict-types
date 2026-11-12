# PHP Auto Strict Types

Personal fork of [PHP - Auto Strict Types](https://github.com/jacovanc/php-auto-strict-types)
by jacovanc. Adds `declare(strict_types=1);` to PHP files before they are saved.

```php
<?php

declare(strict_types=1);

namespace App;
```

Existing declarations are preserved, including declarations with different
spacing and an explicit `strict_types=0`. New declarations use the document's
line endings and are included in the original save.

The extension handles PHP documents saved to local files. A document must begin
with `<?php` and have no PHP closing tag. Closing-tag text inside strings or
block comments is allowed. Documents with unfinished strings or comments are
skipped. The header check handles whitespace, comments and `declare` statements.

## Installation

In VS Code, select **Extensions > … > Install from VSIX…** and choose the
installer. Disable the original `jacovanc.php-auto-strict-types` extension when
using this fork.

## Development

See the [development guide](https://github.com/tomchkk/php-auto-strict-types/blob/main/CONTRIBUTING.md)
for setup, testing, debugging and building a VSIX installer.

## Licence

The original Apache 2.0 licence is preserved in `LICENSE`. This fork changes the
declaration formatting and save handling, and uses the `tomchkk` publisher
identity for personal installation.
