const fs = require("fs");
const path = require("path");
const { parseNotebook } = require("./notebook-parser");
// Function to get all .html files in the src/ directory
function getHtmlFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".html") || file.endsWith(".css"));
}

function getHtmlNotebookFiles(dir) {
  return fs.readdirSync(dir).filter((file) => file.endsWith(".ipynb"));
}

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "docs");
const layoutDir = path.join(__dirname, "layouts");
const htmlFiles = getHtmlFiles(srcDir);

console.log("HTML files in src/:", htmlFiles);

// Loop through each HTML file in the src/ directory
for (const file of htmlFiles) {
  console.log(`Building ${file}...`);
  const filePath = path.join(srcDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  // Extract the template file name using a regular expression
  const templateMatch = content.match(/<!--TEMPLATE:(.+)-->/);
  if (templateMatch && templateMatch[1]) {
    const templateFileName = templateMatch[1].trim();

    // Read the template file
    const templateContent = fs.readFileSync(
      `${layoutDir}/${templateFileName}`,
      "utf-8"
    );
    const newFileContent = templateContent.replace("<!--CONTENT-->", content);
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(`${distDir}/${file}`, newFileContent);
  } else {
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(`${distDir}/${file}`, content);
  }
}

// Loop through each HTML file in the src/blog directory
const blogDir = path.join(srcDir, "blog");
const blogFiles = getHtmlFiles(blogDir);
const notebookFiles = getHtmlNotebookFiles(blogDir);

console.log("HTML files in src/blog/:", blogFiles);

for (const file of blogFiles) {
  console.log(`Building blog/${file}...`);
  const filePath = path.join(blogDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  // Extract the template file name using a regular expression
  const templateMatch = content.match(/<!--TEMPLATE:(.+)-->/);
  if (templateMatch && templateMatch[1]) {
    const templateFileName = templateMatch[1].trim();

    // Read the template file
    const templateContent = fs.readFileSync(
      `${layoutDir}/${templateFileName}`,
      "utf-8"
    );
    const newFileContent = templateContent.replace("<!--CONTENT-->", content);

    // Ensure the dist/blog directory exists
    fs.mkdirSync(path.join(distDir, "blog"), { recursive: true });
    // Write new file to dist/blog/file
    fs.writeFileSync(path.join(distDir, "blog", file), newFileContent);
  } else {
    console.error("Template file not found in blog/index.html");
  }
}

// Loop through each notebook file in the src/blog directory
for (const file of notebookFiles) {
  console.log(`Building blog/${file}...`);
  const filePath = path.join(blogDir, file);
  const html = parseNotebook(filePath);

  const newFileName = file.replace(".ipynb", ".html");

  // Ensure the dist/blog directory exists
  fs.mkdirSync(path.join(distDir, "blog"), { recursive: true });
  // Write new file to dist/blog/file
  fs.writeFileSync(path.join(distDir, "blog", newFileName), html);
}

// Copy assets folder to dist directory
const assetsDir = path.join(__dirname, "assets");
if (fs.existsSync(assetsDir)) {
  // Create assets directory in dist
  fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });

  // Copy all files from assets directory
  const assetFiles = fs.readdirSync(assetsDir);
  for (const file of assetFiles) {
    const srcPath = path.join(assetsDir, file);
    const destPath = path.join(distDir, "assets", file);
    fs.copyFileSync(srcPath, destPath);
  }
  console.log("Assets copied successfully!");
}
console.log("Build complete!");
