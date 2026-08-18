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

Follow the exact process (write/patch `generated-artifacts/<document-name>/document.md`
via the filesystem tools, then paste the directive block from that tool result) described
in your system instructions for this mode — this skill only marks that the request
qualifies for it. Do not restate or deviate from that process here; it is the single
source of truth for tool names, file layout, and the artifact directive format.

## Avoid

- dumping the full document text into chat instead of using the filesystem tools
- inventing a file without actually writing it
- switching to `text/html` or `application/vnd.react` — this is a text document, not a webpage
