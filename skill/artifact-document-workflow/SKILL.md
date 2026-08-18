---
name: artifact-document-workflow
description: Use this skill when the user wants a previewable Markdown document/report artifact, written to a real file on the server.
allowed-tools:
  - artifacts
always-apply: false
# Attached automatically via the fenrix modelSpec's `skills` list and applied
# only when the live Webpage/Document artifacts toggle is set to Document —
# never meant to be picked manually from the `$` skill popover.
user-invocable: false
---

# Artifact Document Workflow

Use this when the user asks for:

- a report, write-up, summary, or proposal
- a substantial text document meant to be reused or shared
- a result that should open in an artifact panel instead of staying as chat text
- a real Markdown file on disk in addition to a preview

## Required behavior

1. Prefer an artifact over a plain chat response when the result should be previewed and reused.
2. Create a real file under `generated-artifacts/<document-name>/document.md` using the filesystem
   tools — do not compose the artifact directive yourself without a matching tool call.
3. Brand-new document → call `write_artifact_file` once with the complete Markdown content, THEN
   paste the directive block from its result.
4. Revising a document you already built (this turn or an earlier one) → call
   `list_artifact_files`/`read_artifact_file` first to find and read the current file with its line
   numbers, identify the minimal lines that actually need to change, then call `patch_artifact_file`
   with just that range. Never re-send the whole file through `write_artifact_file` for a small edit.
5. Structure the document with Markdown headers, sections, and lists as appropriate for a readable
   report.
6. Include the complete and updated content of the document, without any truncation, placeholders,
   ellipses, or "rest remains the same" comments.
7. After the artifact block, briefly list the file you created/changed — do not paste its contents
   again.
8. The artifact directive's Markdown content must match `generated-artifacts/<document-name>/document.md`
   on disk — because it IS that same content, copied from the tool result, not independently retyped.

## Directory rules

- Write only under `generated-artifacts/<document-name>/`
- Use lowercase kebab-case for `<document-name>`
- One file per document: `document.md`

## Avoid

- dumping the full document text into chat outside the artifact block
- inventing a file without actually writing it
- switching to `text/html` or `application/vnd.react` — this is a text document, not a webpage
