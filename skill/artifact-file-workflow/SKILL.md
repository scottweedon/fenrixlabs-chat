---
name: artifact-file-workflow
description: Use this skill when the user wants a previewable HTML/CSS/JS artifact and may also want real files written to the server.
allowed-tools:
  - artifacts
always-apply: false
user-invocable: true
---

# Artifact File Workflow

Use this when the user asks for:

- an HTML artifact
- a landing page, dashboard, or mockup
- a previewable UI
- a result that should open in an artifact panel instead of staying as chat code
- real web files on disk in addition to a preview

## Required behavior

1. Prefer an artifact over plain chat code blocks when the result should be previewed.
2. If the user asks for files, create real files under `generated-artifacts/<artifact-name>/`.
3. Keep HTML, CSS, and JS as separate files unless the user requests a single-file output.
4. Use `index.html` as the main entrypoint unless the user asks for another filename.
5. After file creation, report the created paths briefly instead of pasting the full source into chat.
6. Only return source code inline when artifact creation or file writing is unavailable.
7. For previewable outputs, emit a real artifact directive in the assistant reply:

```text
:::artifact{identifier="<artifact-name>" type="text/html" title="<Readable Title>"}
<!doctype html>
...
:::
```

8. Do not merely claim an artifact was created. The UI preview button appears only when the reply contains the artifact directive itself.
9. If both files and a preview are produced, keep the artifact HTML aligned with `generated-artifacts/<artifact-name>/index.html`.

## Directory rules

- Write only under `generated-artifacts/<artifact-name>/`
- Use lowercase kebab-case for `<artifact-name>`
- Typical structure:

```text
generated-artifacts/<artifact-name>/
  index.html
  styles.css
  script.js
```

## HTML artifact guidance

- Use an HTML artifact when the user expects visual output.
- Keep artifact output consistent with any files written to disk.
- If both an artifact and files are produced, the artifact should represent the same final result.

## Avoid

- dumping large HTML/CSS/JS code blocks into the chat by default
- embedding CSS inline when the user asked for separate files
- inventing files without actually writing them
