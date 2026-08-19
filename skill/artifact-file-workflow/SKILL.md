---
name: artifact-file-workflow
description: Use this skill when the user wants a previewable HTML/CSS/JS artifact and may also want real files written to the server.
allowed-tools:
  - artifacts
always-apply: false
# Attached automatically via the fenrix modelSpec's `skills` list and applied
# only when the live Webpage/Document artifacts toggle is set to Webpage —
# never meant to be picked manually from the `$` skill popover.
user-invocable: false
---

# Artifact File Workflow

Use this when the user asks for:

- an HTML artifact
- a landing page, dashboard, or mockup
- a previewable UI
- a result that should open in an artifact panel instead of staying as chat code
- real web files on disk in addition to a preview

## Required behavior

Follow the exact single-file, layered build process (plan → skeleton → marker-based
`patch_artifact_marker_mcp_artifact-filesystem` calls for sections/styles/script) described
in your system instructions for this mode — this skill only marks that the request qualifies
for it. Do not restate or deviate from that process here; it is the single source of truth
for tool names, file layout, and the artifact directive format.

## Avoid

- dumping large HTML/CSS/JS code blocks into the chat instead of using the filesystem tools
- inventing files without actually writing them
- switching to a multi-file layout (`create_artifact_bundle_mcp_artifact-filesystem`) unless
  the user explicitly asks for separate downloadable CSS/JS files
