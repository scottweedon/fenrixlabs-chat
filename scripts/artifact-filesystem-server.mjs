import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function resolveRootDir(rootArg) {
  if (!rootArg) {
    throw new Error('A root directory is required');
  }

  return path.resolve(rootArg);
}

async function ensureRoot(rootDir) {
  await fs.mkdir(rootDir, { recursive: true });
}

function createSafePathResolver(rootDir) {
  return (relativePath) => {
    const trimmed = `${relativePath ?? ''}`.replace(/^[/\\]+/, '');
    const candidate = path.resolve(rootDir, trimmed);

    if (candidate !== rootDir && !candidate.startsWith(`${rootDir}${path.sep}`)) {
      throw new Error(`Path escapes artifact root: ${relativePath}`);
    }

    return candidate;
  };
}

async function statOrNull(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

async function readText(targetPath) {
  return fs.readFile(targetPath, 'utf8');
}

/** Splits on line breaks without losing a trailing blank line (`content.split('\n')`
 *  already does this correctly; kept as a named helper so patch/number logic reads clearly). */
function splitLines(content) {
  return content.split('\n');
}

function numberLines(content) {
  const lines = splitLines(content);
  const width = String(lines.length).length;
  return lines.map((line, idx) => `${String(idx + 1).padStart(width)}: ${line}`).join('\n');
}

/**
 * Conservative "does this look finished" check, not a real HTML parser — mirrors the
 * honest-heuristic precedent in packages/api/src/agents/handlers.ts (isCompleteImage),
 * which checks PNG/WebP end-of-file markers rather than fully validating the format.
 * False negatives (flagging genuinely-complete-but-unusual markup) are acceptable; this
 * only ever adds a warning line to a tool result, it never blocks the write.
 */
function looksCompleteHtml(content) {
  const trimmed = content.trimEnd();
  if (!/<\/html\s*>$/i.test(trimmed)) {
    return false;
  }
  const countMatches = (re) => (content.match(re) ?? []).length;
  if (countMatches(/<script[\s>]/gi) !== countMatches(/<\/script\s*>/gi)) {
    return false;
  }
  if (countMatches(/<style[\s>]/gi) !== countMatches(/<\/style\s*>/gi)) {
    return false;
  }
  return true;
}

const INCOMPLETE_HTML_WARNING =
  '\n\nWARNING: this file does not look complete (missing a closing </html>, or an unclosed <script>/<style> block) — it may have been cut off. If you have more content to add, call patch_artifact_file_mcp_artifact-filesystem now to append it before ending your reply.';

const SCRIPT_SRC_RE = /<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
const LINK_HREF_RE = /<link\b[^>]*\shref\s*=\s*["']([^"']+)["'][^>]*>/gi;

function isLocalAssetRef(href) {
  return !/^([a-z]+:)?\/\//i.test(href) && !/^data:/i.test(href) && !href.startsWith('#');
}

/**
 * Real, concrete failure mode this catches (found by inspecting a broken artifact a
 * user reported): the model wrote a self-contained-looking index.html referencing
 * `<script src="script.js">`/`<link rel="stylesheet" href="styles.css">`, but a
 * companion `create_artifact_bundle`/`write_artifact_file` call for those files
 * either never happened or failed — the page passes `looksCompleteHtml` (its own
 * tags are all balanced) while still being broken, because it points at files that
 * don't exist. Resolves each local `src`/`href` relative to the HTML file's own
 * directory, matching how a browser would resolve it.
 */
async function findMissingLocalAssets(content, htmlDir) {
  const hrefs = new Set();
  for (const re of [SCRIPT_SRC_RE, LINK_HREF_RE]) {
    for (const match of content.matchAll(re)) {
      if (isLocalAssetRef(match[1])) {
        hrefs.add(match[1]);
      }
    }
  }

  const missing = [];
  for (const href of hrefs) {
    const stat = await statOrNull(path.resolve(htmlDir, href));
    if (!stat || !stat.isFile()) {
      missing.push(href);
    }
  }
  return missing;
}

function missingAssetsWarning(missing) {
  if (missing.length === 0) {
    return '';
  }
  return `\n\nWARNING: this file links to local file(s) that do not exist yet: ${missing.join(', ')}. Either write them now (write_artifact_file_mcp_artifact-filesystem/patch_artifact_file_mcp_artifact-filesystem), or inline that content directly into this HTML with <style>/<script> tags, before ending your reply.`;
}

const SECTION_MARKER_RE = /<!--\s*SECTION:[^>]*-->/gi;
const TODO_MARKER_RE = /\/\*\s*TODO\b[^*]*\*\/|\/\/\s*TODO\b.*/gi;

/**
 * Finds leftover `<!-- SECTION: name -->` placeholders (the layered-build skeleton
 * convention) and `TODO` comments in style/script blocks — the mechanical signal for
 * "is this artifact actually finished" instead of leaving that judgment call to the
 * model, which is what let an earlier real build get abandoned half-done (see the
 * STATUS hint below).
 */
function findRemainingPlaceholders(content) {
  const found = [];
  for (const re of [SECTION_MARKER_RE, TODO_MARKER_RE]) {
    for (const match of content.matchAll(re)) {
      found.push(match[0].trim());
    }
  }
  return found;
}

function placeholderStatusHint(remaining) {
  if (remaining.length > 0) {
    return `\n\nSTATUS: placeholders still remain — ${remaining.join(', ')}. Do NOT paste the artifact directive as your final reply yet; keep patching until none remain.`;
  }
  return '\n\nSTATUS: no placeholders remain. If this was your last planned edit, paste THIS directive below as your final reply now — do not paste an earlier one.';
}

function normalizeArtifactName(name) {
  return `${name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Every tool's zod schema below marks its params `.optional()` even where
 * logically required — that keeps the MCP SDK's own upfront schema
 * validation from rejecting a call outright (with a generic "did not match
 * expected schema" message carrying no detail) when the model omits a field
 * or uses the wrong key name. These helpers do the real requiredness/type
 * check ourselves, inside the handler, so the model gets back a specific,
 * actionable message — the exact field name, what was expected, and what it
 * actually sent — instead of a dead end it has to guess its way out of.
 */
function describeReceived(value) {
  return value === undefined ? 'nothing (the field was omitted)' : JSON.stringify(value);
}

function requireString(value, paramName) {
  if (typeof value !== 'string') {
    throw new Error(
      `\`${paramName}\` is required and must be a string. You passed ${describeReceived(value)}.`,
    );
  }
  return value;
}

function requirePositiveInt(value, paramName) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `\`${paramName}\` is required and must be a positive integer. You passed ${describeReceived(value)}.`,
    );
  }
  return value;
}

function optionalString(value, paramName) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`\`${paramName}\`, if provided, must be a string. You passed ${describeReceived(value)}.`);
  }
  return value;
}

/**
 * The LibreChat artifact panel renders `:::artifact{...}` HTML content as a
 * standalone document with no access to sibling files on disk, so external
 * `<link rel="stylesheet">`/`<script src>` references to styles.css/script.js
 * would render blank. Inline both directly into the HTML so the artifact
 * preview is self-contained regardless of how the caller organized files.
 */
function inlineAssets(indexHtml, stylesCss, scriptJs) {
  let html = indexHtml;

  if (stylesCss != null) {
    const styleTag = `<style>\n${stylesCss}\n</style>`;
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${styleTag}\n</head>`) : `${styleTag}\n${html}`;
  }

  if (scriptJs != null) {
    const scriptTag = `<script>\n${scriptJs}\n</script>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${scriptTag}\n</body>`) : `${html}\n${scriptTag}`;
  }

  return html;
}

/**
 * Local models frequently write files through this tool but then fail to
 * also emit LibreChat's `:::artifact{...}` markdown directive from scratch —
 * the only thing that actually opens the preview panel. Handing back the
 * exact, pre-filled block for the model to copy verbatim is far more
 * reliable than asking it to construct one from system-prompt rules alone.
 */
function buildArtifactDirective(identifier, title, content, mimeType = 'text/html') {
  let fenceLength = 4;
  const fenceMatches = content.match(/`{4,}/g) ?? [];
  for (const match of fenceMatches) {
    fenceLength = Math.max(fenceLength, match.length + 1);
  }
  const fence = '`'.repeat(fenceLength);
  const escapedTitle = title.replace(/"/g, '\\"');

  return [
    `:::artifact{identifier="${identifier}" type="${mimeType}" title="${escapedTitle}"}`,
    fence,
    content,
    fence,
    ':::',
  ].join('\n');
}

function createArtifactFilesystemServer(rootArg) {
  const rootDir = resolveRootDir(rootArg);
  const resolveSafePath = createSafePathResolver(rootDir);
  const server = new McpServer({
    name: 'artifact-filesystem',
    version: '0.1.0',
  });

  server.tool(
    'list_artifact_files',
    'List files and folders under the generated-artifacts root or one artifact subdirectory.',
    {
      relative_path: z.string().optional(),
    },
    async ({ relative_path: rawRelativePath }) => {
      const relative_path = optionalString(rawRelativePath, 'relative_path') ?? '';
      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat) {
        throw new Error(`Path not found: ${relative_path}`);
      }

      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${relative_path}`);
      }

      const entries = await fs.readdir(target, { withFileTypes: true });
      const lines = entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => `${entry.isDirectory() ? 'dir ' : 'file'} ${entry.name}`);

      return {
        content: [{ type: 'text', text: lines.join('\n') || '(empty directory)' }],
      };
    },
  );

  server.tool(
    'read_artifact_file',
    'Read a UTF-8 text file from generated-artifacts, with line numbers. Use these numbers with patch_artifact_file_mcp_artifact-filesystem to make targeted edits instead of rewriting the whole file.',
    {
      relative_path: z.string().optional(),
    },
    async ({ relative_path: rawRelativePath }) => {
      const relative_path = requireString(rawRelativePath, 'relative_path');
      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat || !stat.isFile()) {
        throw new Error(`File not found: ${relative_path}`);
      }

      const text = await readText(target);
      return {
        content: [{ type: 'text', text: numberLines(text) }],
      };
    },
  );

  /**
   * Shared result-builder for any tool that leaves a full, current copy of a text
   * file's content in hand (write, or a patch that just modified it) — the artifact
   * preview needs the complete content in the chat reply regardless of how the file
   * was edited on disk, so write and patch both funnel through this. HTML gets the
   * completeness/missing-asset checks; Markdown gets a directive with no HTML-only
   * checks; anything else falls back to a plain confirmation with no directive.
   */
  async function buildArtifactWriteResult(relative_path, content, actionLine) {
    const isHtml = /\.html?$/i.test(relative_path);
    const isMarkdown = /\.(md|markdown)$/i.test(relative_path);

    if (!isHtml && !isMarkdown) {
      return {
        content: [{ type: 'text', text: actionLine }],
      };
    }

    if (isMarkdown) {
      const identifier = normalizeArtifactName(relative_path.replace(/\.(md|markdown)$/i, '')) || 'artifact';
      const directive = buildArtifactDirective(identifier, relative_path, content, 'text/markdown');

      return {
        content: [
          {
            type: 'text',
            text: [
              actionLine,
              '',
              'To show the preview panel, copy the following block into your reply to the user EXACTLY as-is (do not summarize or paraphrase it, do not wrap it in another code fence):',
              '',
              directive,
            ].join('\n'),
          },
        ],
      };
    }

    const identifier = normalizeArtifactName(relative_path.replace(/\.html?$/i, '')) || 'artifact';
    const directive = buildArtifactDirective(identifier, relative_path, content);
    const htmlDir = path.dirname(resolveSafePath(relative_path));
    const missingAssets = await findMissingLocalAssets(content, htmlDir);
    const warning =
      (looksCompleteHtml(content) ? '' : INCOMPLETE_HTML_WARNING) +
      missingAssetsWarning(missingAssets) +
      placeholderStatusHint(findRemainingPlaceholders(content));

    return {
      content: [
        {
          type: 'text',
          text: [
            `${actionLine}${warning}`,
            '',
            'To show the preview panel, copy the following block into your reply to the user EXACTLY as-is (do not summarize or paraphrase it, do not wrap it in another code fence):',
            '',
            directive,
          ].join('\n'),
        },
      ],
    };
  }

  server.tool(
    'write_artifact_file',
    'Create or overwrite a UTF-8 text file under generated-artifacts.',
    {
      relative_path: z.string().optional(),
      content: z.string().optional(),
    },
    async ({ relative_path: rawRelativePath, content: rawContent }) => {
      const relative_path = requireString(rawRelativePath, 'relative_path');
      const content = requireString(rawContent, 'content');
      const target = resolveSafePath(relative_path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, 'utf8');

      return buildArtifactWriteResult(relative_path, content, `Wrote ${relative_path}.`);
    },
  );

  server.tool(
    'patch_artifact_file',
    'Replace a range of lines in an existing UTF-8 text file with new content, without rewriting the whole file. Use read_artifact_file first to see current line numbers. 1-indexed, inclusive range: to insert before line N without removing anything, use start_line = end_line = N. To delete lines, pass new_content = "".',
    {
      relative_path: z.string().optional(),
      start_line: z.number().optional(),
      end_line: z.number().optional(),
      new_content: z.string().optional(),
    },
    async ({
      relative_path: rawRelativePath,
      start_line: rawStartLine,
      end_line: rawEndLine,
      new_content: rawNewContent,
    }) => {
      const relative_path = requireString(rawRelativePath, 'relative_path');
      const start_line = requirePositiveInt(rawStartLine, 'start_line');
      const end_line = requirePositiveInt(rawEndLine, 'end_line');
      // Empty string is a valid, meaningful value here (deletes the range) —
      // only reject a genuinely missing/non-string new_content.
      const new_content = requireString(rawNewContent, 'new_content');
      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat || !stat.isFile()) {
        throw new Error(`File not found: ${relative_path}`);
      }

      if (end_line < start_line) {
        throw new Error(`end_line (${end_line}) must be >= start_line (${start_line})`);
      }

      const original = await readText(target);
      const lines = splitLines(original);
      // A pure insert targets one line past the end (start_line = end_line = lines.length + 1)
      // without removing anything that exists — everything else must be in range.
      const isPureInsert = start_line === end_line && start_line === lines.length + 1;
      if (!isPureInsert && (start_line > lines.length || end_line > lines.length)) {
        throw new Error(
          `Range ${start_line}-${end_line} is out of bounds — ${relative_path} has ${lines.length} lines. Re-read the file to get current line numbers.`,
        );
      }

      const before = lines.slice(0, start_line - 1);
      const after = isPureInsert ? [] : lines.slice(end_line);
      const inserted = new_content === '' ? [] : splitLines(new_content);
      const updated = [...before, ...inserted, ...after].join('\n');

      await fs.writeFile(target, updated, 'utf8');

      return buildArtifactWriteResult(
        relative_path,
        updated,
        `Patched ${relative_path} (lines ${start_line}-${end_line}).`,
      );
    },
  );

  server.tool(
    'patch_artifact_marker',
    'Replace a unique marker string (e.g. a "<!-- SECTION: hero -->" placeholder comment, or a "/* TODO: styles */" comment) with new content — no need to read the file or know line numbers first. The marker must appear in the file exactly once; use this for filling in the placeholders a skeleton file was written with.',
    {
      relative_path: z.string().optional(),
      marker: z.string().optional(),
      new_content: z.string().optional(),
    },
    async ({ relative_path: rawRelativePath, marker: rawMarker, new_content: rawNewContent }) => {
      const relative_path = requireString(rawRelativePath, 'relative_path');
      const marker = requireString(rawMarker, 'marker');
      const new_content = requireString(rawNewContent, 'new_content');
      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat || !stat.isFile()) {
        throw new Error(`File not found: ${relative_path}`);
      }

      const original = await readText(target);
      const occurrences = original.split(marker).length - 1;

      if (occurrences === 0) {
        throw new Error(
          `Marker not found in ${relative_path}: ${JSON.stringify(marker)}. Re-read the file, or it may already have been replaced.`,
        );
      }
      if (occurrences > 1) {
        throw new Error(
          `Marker is ambiguous in ${relative_path} — found ${occurrences} occurrences of ${JSON.stringify(marker)}. Use patch_artifact_file_mcp_artifact-filesystem with explicit line numbers instead.`,
        );
      }

      const updated = original.replace(marker, new_content);
      await fs.writeFile(target, updated, 'utf8');

      return buildArtifactWriteResult(relative_path, updated, `Patched ${relative_path} (replaced marker).`);
    },
  );

  server.tool(
    'create_artifact_bundle',
    'Create a new artifact folder with index.html and optional companion files.',
    {
      artifact_name: z.string().optional(),
      index_html: z.string().optional(),
      styles_css: z.string().optional(),
      script_js: z.string().optional(),
    },
    async ({
      artifact_name: rawArtifactName,
      index_html: rawIndexHtml,
      styles_css: rawStylesCss,
      script_js: rawScriptJs,
    }) => {
      const artifact_name = requireString(rawArtifactName, 'artifact_name');
      const index_html = requireString(rawIndexHtml, 'index_html');
      const styles_css = optionalString(rawStylesCss, 'styles_css');
      const script_js = optionalString(rawScriptJs, 'script_js');
      const safeName = normalizeArtifactName(artifact_name);

      if (!safeName) {
        throw new Error('artifact_name must contain at least one alphanumeric character');
      }

      const artifactDir = resolveSafePath(safeName);
      await fs.mkdir(artifactDir, { recursive: true });
      await fs.writeFile(path.join(artifactDir, 'index.html'), index_html, 'utf8');

      if (styles_css != null) {
        await fs.writeFile(path.join(artifactDir, 'styles.css'), styles_css, 'utf8');
      }

      if (script_js != null) {
        await fs.writeFile(path.join(artifactDir, 'script.js'), script_js, 'utf8');
      }

      const created = ['index.html'];

      if (styles_css != null) {
        created.push('styles.css');
      }

      if (script_js != null) {
        created.push('script.js');
      }

      const previewHtml = inlineAssets(index_html, styles_css, script_js);
      const directive = buildArtifactDirective(safeName, artifact_name, previewHtml);
      const missingAssets = await findMissingLocalAssets(previewHtml, artifactDir);
      const warning =
        (looksCompleteHtml(previewHtml) ? '' : INCOMPLETE_HTML_WARNING) +
        missingAssetsWarning(missingAssets) +
        placeholderStatusHint(findRemainingPlaceholders(previewHtml));

      return {
        content: [
          {
            type: 'text',
            text: [
              `Created generated-artifacts/${safeName}/ with ${created.join(', ')}.${warning}`,
              '',
              'To show the preview panel, copy the following block into your reply to the user EXACTLY as-is (do not summarize or paraphrase it, do not wrap it in another code fence):',
              '',
              directive,
            ].join('\n'),
          },
        ],
      };
    },
  );

  server.tool(
    'delete_artifact_path',
    'Delete a file or directory tree under generated-artifacts.',
    {
      relative_path: z.string().optional(),
    },
    async ({ relative_path: rawRelativePath }) => {
      const relative_path = requireString(rawRelativePath, 'relative_path');
      if (relative_path === '.' || relative_path === '/') {
        throw new Error('Refusing to delete the artifact root');
      }

      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat) {
        throw new Error(`Path not found: ${relative_path}`);
      }

      await fs.rm(target, { recursive: true, force: true });
      return {
        content: [{ type: 'text', text: `Deleted ${relative_path}` }],
      };
    },
  );

  return {
    rootDir,
    server,
    ensureRoot: () => ensureRoot(rootDir),
  };
}

export { createArtifactFilesystemServer };
