#!/usr/bin/env node

/**
 * A standalone Jupyter Notebook parser in Node.js.
 * Reads an .ipynb file and outputs an HTML file.
 *
 * Features:
 *   - Converts Markdown cells (processing image attachments).
 *   - Wraps code input cells in HTML with Python syntax highlighting.
 *   - Wraps code output cells (text, error, or HTML outputs) in containers with max-height 400px and scrollable overflow.
 *   - Displays image outputs from code cells (PNG, JPEG, or SVG).
 *   - Injects MathJax so that:
 *         Inline math:  $...$
 *         Display math: $$...$$
 *
 * Usage:
 *   node notebook-parser.js input.ipynb [output.html]
 * If [output.html] is not provided, the script will generate one with the same base name.
 */

const fs = require("fs");
const path = require("path");
const marked = require("marked");

exports.parseNotebook = function (inputPath) {
  // Check if the input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file ${inputPath} does not exist.`);
    process.exit(1);
  }

  try {
    // Read and parse the notebook JSON
    const data = fs.readFileSync(inputPath, "utf8");
    const notebook = JSON.parse(data);

    // Convert the notebook to HTML
    const htmlContent = parseNotebook(notebook);

    // Wrap the content in a full HTML document with MathJax and Highlight.js configuration
    const fullHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/style.css">
      <title>Kevin Peterson - Software Engineer</title>
    <style>
      pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
      /* Code input cells are rendered normally */
      pre.code-cell {
        /* No max-height on code inputs */
      }
      /* Code output cells have a maximum height of 400px and are scrollable */
      .code-output {
        max-height: 400px;
        overflow-y: auto;
      }
      code { font-family: monospace; }
      .error { color: red; }
      h3 { border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
      img { max-width: 100%; height: auto; }
    </style>
    <!-- Highlight.js CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css">
    <!-- MathJax configuration:
         Inline math:  $...$
         Display math: $$...$$ -->
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']]
        }
      };
    </script>
    <!-- Load MathJax -->
    <script type="text/javascript"
      id="MathJax-script"
      async
      src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
    </script>
    <!-- Load Highlight.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
  </head>
  <body>
  <div style="max-width: 900px; overflow-y:auto;margin:auto;">
  ${htmlContent}
  </div>
  <script>
    // Initialize syntax highlighting after the content loads.
    document.addEventListener('DOMContentLoaded', (event) => {
      hljs.highlightAll();
    });
  </script>
  <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
  </body>
  </html>
    `;

    return fullHtml;
  } catch (err) {
    console.error("Error processing notebook:", err);
    process.exit(1);
  }
};

/**
 * Parses a Jupyter Notebook JSON object and converts its cells to HTML.
 * @param {Object} notebook - The parsed notebook JSON.
 * @returns {string} HTML representation of the notebook.
 */
function parseNotebook(notebook) {
  let html = "";

  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    return "<p>No cells found in this notebook.</p>";
  }

  notebook.cells.forEach((cell) => {
    if (cell.cell_type === "markdown") {
      // Join markdown lines and process attachments if present
      let source = Array.isArray(cell.source)
        ? cell.source.join("")
        : cell.source;
      if (cell.attachments) {
        source = processAttachments(source, cell.attachments);
      }
      html += marked.parse(source);
    } else if (cell.cell_type === "code") {
      // Render code input (with Python syntax highlighting)
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : cell.source;
      html += `<pre class="code-cell"><code class="language-python">${escapeHtml(
        source
      )}</code></pre>`;

      // Process outputs from the code cell, wrapping them in a container with max height and scrollability.
      if (cell.outputs && Array.isArray(cell.outputs)) {
        cell.outputs.forEach((output) => {
          if (output.output_type === "stream") {
            const text = Array.isArray(output.text)
              ? output.text.join("")
              : output.text;
            html += `<pre class="code-output">${escapeHtml(text)}</pre>`;
          } else if (
            output.output_type === "execute_result" ||
            output.output_type === "display_data"
          ) {
            if (output.data) {
              // Prefer HTML if available
              if (output.data["text/html"]) {
                const htmlData = Array.isArray(output.data["text/html"])
                  ? output.data["text/html"].join("")
                  : output.data["text/html"];
                html += `<div class="code-output">${htmlData}</div>`;
              }
              // Check for image outputs
              else if (output.data["image/png"]) {
                const imageData = Array.isArray(output.data["image/png"])
                  ? output.data["image/png"].join("")
                  : output.data["image/png"];
                html += `<img src="data:image/png;base64,${imageData}" alt="Image Output">`;
              } else if (output.data["image/jpeg"]) {
                const imageData = Array.isArray(output.data["image/jpeg"])
                  ? output.data["image/jpeg"].join("")
                  : output.data["image/jpeg"];
                html += `<img src="data:image/jpeg;base64,${imageData}" alt="Image Output">`;
              } else if (output.data["image/svg+xml"]) {
                const imageData = Array.isArray(output.data["image/svg+xml"])
                  ? output.data["image/svg+xml"].join("")
                  : output.data["image/svg+xml"];
                html += `<img src="data:image/svg+xml;base64,${imageData}" alt="Image Output">`;
              } else if (output.data["text/plain"]) {
                const textData = Array.isArray(output.data["text/plain"])
                  ? output.data["text/plain"].join("")
                  : output.data["text/plain"];
                html += `<pre class="code-output">${escapeHtml(
                  textData
                )}</pre>`;
              }
            }
          } else if (output.output_type === "error") {
            const traceback = Array.isArray(output.traceback)
              ? output.traceback.join("\n")
              : output.traceback;
            html += `<pre class="error code-output">${escapeHtml(
              traceback
            )}</pre>`;
          }
        });
      }
    } else if (cell.cell_type === "raw") {
      // Display raw cell content
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : cell.source;
      html += `<pre>${escapeHtml(source)}</pre>`;
    }
  });

  return html;
}

/**
 * Processes image attachments in a Markdown cell.
 * Looks for patterns like: ![alt text](attachment:filename.png)
 * and replaces them with an inline image using a data URL.
 *
 * @param {string} source - The markdown source text.
 * @param {Object} attachments - The attachments object from the cell.
 * @returns {string} The modified markdown source with attachments replaced.
 */
function processAttachments(source, attachments) {
  return source.replace(
    /!\[([^\]]*)\]\(attachment:([^\)]+)\)/g,
    (match, alt, attachmentName) => {
      if (attachments && attachments[attachmentName]) {
        const attachmentData = attachments[attachmentName];
        // Use the first MIME type available
        const mimeType = Object.keys(attachmentData)[0];
        const base64Data = attachmentData[mimeType];
        return `![${alt}](data:${mimeType};base64,${base64Data})`;
      } else {
        return match;
      }
    }
  );
}

/**
 * Escapes HTML special characters to prevent injection.
 * @param {string} text - The text to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}
