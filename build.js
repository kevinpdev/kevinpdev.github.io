const fs = require("fs");
const path = require("path");

// Function to get all .html files in the src/ directory
function getHtmlFiles(dir) {
  return fs.readdirSync(dir).filter((file) => file.endsWith(".html"));
}

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");
const layoutDir = path.join(__dirname, "layouts");
const htmlFiles = getHtmlFiles(srcDir);

console.log("HTML files in src/:", htmlFiles);

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

    // Ensure the dist directory exists
    fs.mkdirSync(distDir, { recursive: true });
    //write new file to dist/file
    fs.writeFileSync(`${distDir}/${file}`, newFileContent);
  } else {
    console.error("Template file not found in index.html");
  }
}

console.log("Build complete!");
