# Waseem Ansari — Portfolio

Personal portfolio site for Waseem Ansari, Computer Engineer (B.E.) —
software engineering, QA, and AI & search evaluation.

**Live:** https://waseemwdd0165-jpg.github.io

## How to publish an update

1. Open https://github.com/waseemwdd0165-jpg/waseemwdd0165-jpg.github.io/upload/main
2. Select **everything** in this folder and drag it onto the page
3. Click **Commit changes**, and confirm overwriting existing files

That's the whole process. The folder is the website — no build step, no
staging copy, no files to leave behind. Give it a minute, then reload the
live URL.

## What's here

| File | |
|---|---|
| `index.html` | The portfolio site |
| `app.css` | Shared styling for the four tools — must be uploaded with them |
| `llm-evaluator.html` | RLHF preference rating: side-by-side scoring, gold-label agreement, JSONL export |
| `search-rater.html` | Search quality rating: Needs Met and Page Quality scales, CSV export |
| `prompt-workbench.html` | Prompt versioning with automated checks across a fixed test set |
| `annotation-tool.html` | Span labelling for NER data, with inter-annotator agreement |
| `Waseem-Ansari-CV.pdf` | CV, served by the download button on the site |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

The four tools run entirely in the browser on built-in sample data. No API
key, no server, no build.

### Not part of the website

`source/` and `originals/` upload harmlessly and are never served.

- `source/Waseem-Ansari-CV.docx` — editable CV. Edit here, then export a new PDF over the one above.
- `source/build_cv.py` — regenerates the CV from scratch.
- `source/waseem-portfolio-artifact.html` — the Claude-hosted copy of the site.
- `originals/` — the original CV and BE degree certificate as supplied.

## Still to confirm

The CV's **Languages** line reads English, Hindi, Urdu, Marathi. That was
inferred from the localization work, not supplied — correct it if wrong.
