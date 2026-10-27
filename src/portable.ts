import { MAX_JSON_BYTES, serialize, validateDiagram, type Diagram } from './model.ts';

export const PORTABLE_DOCUMENT_ID = 'pure-diagram-document';
export interface PortableAssets {
  /**
  Trusted production module contents, never URLs or user-supplied JavaScript.
  */
  scripts: readonly string[];
  /**
  Trusted production CSS contents, never external stylesheet URLs.
  */
  styles: readonly string[];
}
const CSP
  = 'default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; '
    + 'img-src data: blob:; font-src data:; connect-src data: blob:; base-uri \'none\'; form-action \'none\'';
const escapeHtml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
      })[character] ?? character
  );

function validateAssets(assets: PortableAssets): void {
  if (
    assets.scripts.length === 0
    || assets.scripts.some((script) => !script.trim())
    || assets.styles.length === 0
    || assets.styles.some((style) => !style.trim())
  ) {
    throw new Error(
      'Portable HTML requires the complete inline production script and styles. '
      + 'Open the built project site, not the development server, and retry.'
    );
  }
  for (const script of assets.scripts) {
    // Fail rather than rewrite executable code and risk changing its meaning.
    if (/<\/script\b|<!--/i.test(script))
      throw new Error(
        'The production script contains unsafe inline HTML delimiters. '
        + 'Rebuild with inline-script escaping before exporting.'
      );
    // Do not infer JavaScript dependencies from text: library diagnostics can mention
    // imports. The caller supplies only the trusted single-file production bundle.
  }
  for (const style of assets.styles) {
    if (/<\/style\b/i.test(style))
      throw new Error(
        'The production styles contain an unsafe closing style tag. Rebuild the inline stylesheet before exporting.'
      );
    if (/@import\b/i.test(style))
      throw new Error(
        'Portable HTML cannot depend on imported stylesheets. Bundle all styles before exporting.'
      );
    // Assets are trusted build output, not imported document content.
    // eslint-disable-next-line sonarjs/super-linear-regex
    for (const match of style.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/gi)) {
      const resource = (match[2] ?? match[3] ?? '').trim();
      if (!/^(?:data:|#)/i.test(resource))
        throw new Error(
          'Portable HTML requires embedded CSS resources. '
          + 'Replace external or temporary URLs with data URLs before exporting.'
        );
    }
  }
}

/**
Assemble trusted application assets and untrusted diagram data without any I/O.
Callers must reject external script/link elements before collecting inline text.
Asset checks reject missing inline content and CSS dependencies; the CSP blocks network loads.
*/
export function createPortableHtml(document: Diagram, assets: PortableAssets): string {
  const canonical = serialize(document);
  validateAssets(assets);
  const payload = canonical.replaceAll(
    /[<>&\u{2028}\u{2029}]/gu,
    (character) => String.raw`\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`
  );
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(CSP)}"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<title>${escapeHtml(document.title || 'Untitled diagram')} — Pure Diagramming</title>
${assets.styles.map((style) => `<style data-pure-diagram-style>${style}</style>`).join('\n')}
</head><body><div id="root"></div>
<noscript>${
  'This portable diagram viewer requires JavaScript. '
  + 'Keep the separate JSON file as the editable source.'
}</noscript>
<script type="application/json" id="${PORTABLE_DOCUMENT_ID}">${payload}</script>
${assets.scripts.map((script) => `<script type="module" data-pure-diagram-bundle>${script}</script>`).join('\n')}
</body></html>\n`;
}

/**
Decode only the inert payload; retain the normal decoded document-size contract.
*/
export function parsePortableDocument(payload: string): Diagram {
  if (new TextEncoder().encode(payload).byteLength > MAX_JSON_BYTES * 6) {
    throw new Error('Portable document payload exceeds 30 MB; choose a smaller valid viewing file.');
  }
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    throw new Error(
      'Invalid portable document JSON; keep the original editable file and regenerate the viewing artifact.'
    );
  }
  return validateDiagram(value);
}
