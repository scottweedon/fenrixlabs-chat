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

function normalizeArtifactName(name) {
  return `${name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
function buildArtifactDirective(identifier, title, html) {
  let fenceLength = 4;
  const fenceMatches = html.match(/`{4,}/g) ?? [];
  for (const match of fenceMatches) {
    fenceLength = Math.max(fenceLength, match.length + 1);
  }
  const fence = '`'.repeat(fenceLength);
  const escapedTitle = title.replace(/"/g, '\\"');

  return [
    `:::artifact{identifier="${identifier}" type="text/html" title="${escapedTitle}"}`,
    fence,
    html,
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
      relative_path: z.string().optional().default(''),
    },
    async ({ relative_path }) => {
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
    'Read a UTF-8 text file from generated-artifacts.',
    {
      relative_path: z.string(),
    },
    async ({ relative_path }) => {
      const target = resolveSafePath(relative_path);
      const stat = await statOrNull(target);

      if (!stat || !stat.isFile()) {
        throw new Error(`File not found: ${relative_path}`);
      }

      const text = await readText(target);
      return {
        content: [{ type: 'text', text }],
      };
    },
  );

  server.tool(
    'write_artifact_file',
    'Create or overwrite a UTF-8 text file under generated-artifacts.',
    {
      relative_path: z.string(),
      content: z.string(),
    },
    async ({ relative_path, content }) => {
      const target = resolveSafePath(relative_path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, 'utf8');

      if (!/\.html?$/i.test(relative_path)) {
        return {
          content: [{ type: 'text', text: `Wrote ${relative_path}` }],
        };
      }

      const identifier = normalizeArtifactName(relative_path.replace(/\.html?$/i, '')) || 'artifact';
      const directive = buildArtifactDirective(identifier, relative_path, content);

      return {
        content: [
          {
            type: 'text',
            text: [
              `Wrote ${relative_path}.`,
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
    'create_artifact_bundle',
    'Create a new artifact folder with index.html and optional companion files.',
    {
      artifact_name: z.string(),
      index_html: z.string(),
      styles_css: z.string().optional(),
      script_js: z.string().optional(),
    },
    async ({ artifact_name, index_html, styles_css, script_js }) => {
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

      return {
        content: [
          {
            type: 'text',
            text: [
              `Created generated-artifacts/${safeName}/ with ${created.join(', ')}.`,
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
      relative_path: z.string(),
    },
    async ({ relative_path }) => {
      if (!relative_path || relative_path === '.' || relative_path === '/') {
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
