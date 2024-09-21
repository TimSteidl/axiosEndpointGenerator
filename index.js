#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

function checkForFiles() {
  const currentDir = process.cwd();
  const file = "pom.xml";
  const filePath = path.join(currentDir, file);
  if (fs.existsSync(filePath)) {
    fs.readdirSync(currentDir).forEach((file) => {
      if (file === "pom.xml") {
        console.log("Found pom.xml in the current directory");
        console.log(
          "Looking for @RestController classes in a Maven project...",
        );
        findRestControllers(currentDir);
      }
    });
  } else {
    console.log(`${file} not found in the current directory.`);
  }
}

function findRestControllers(baseDir) {
  const srcDir = path.join(baseDir, "src", "main", "java");

  if (fs.existsSync(srcDir)) {
    const javaFiles = getAllFiles(srcDir, ".java");
    const restControllerFiles = javaFiles.filter((file) => {
      const content = fs.readFileSync(file, "utf-8");
      return content.includes("@RestController");
    });

    if (restControllerFiles.length > 0) {
      console.log("Found the following @RestController files:");
      restControllerFiles.forEach((file) => functionParser(file));
    } else {
      console.log("No @RestController files found.");
    }
  } else {
    console.log(
      "src/main/java directory not found. Make sure this is a standard Maven project.",
    );
  }
}

function getAllFiles(dirPath, extension, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function (file) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory() && file !== "node_modules") {
      arrayOfFiles = getAllFiles(filePath, extension, arrayOfFiles);
    } else if (file.endsWith(extension)) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function functionParser(filePath) {
  const tsParameters = [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let baseUrl = lines
    .filter((line) => line.startsWith("@RequestMapping"))
    .map((line) => line.split("(")[1].split(")")[0])[0];
  let lastLine = "";

  lines.forEach((line) => {
    if (
      line.includes("public") &&
      !line.includes("class") &&
      parseMapping(lastLine) !== null
    ) {
      const methodType = parseMapping(lastLine);
      const returnType = line.trim().split(" ")[1];
      let parameterMethod = "";
      let parameterType = "";
      let parameterName = "";
      const functionParameters = line
        .split("(")[1]
        .toString()
        .split(")")[0]
        .toString()
        .split(",");
      functionParameters.forEach((parameter) => {
        parameterMethod = parameter.split(" ")[0];
        parameterType = parameter.split(" ")[1];
        parameterName = parameter.split(" ")[2];
        fillTemplate({
          method: parameterMethod,
          type: parameterType,
          name: parameterName,
          url: baseUrl,
          returnType: returnType,
          methodType: methodType,
        });
      });
    }
    lastLine = line;
  });
  return tsParameters;
}

function parseMapping(mappingLine) {
  const mapping = mappingLine.split("(")[0].trim();
  if (mapping === "@GetMapping") {
    return "get";
  } else if (mapping === "@PostMapping") {
    return "post";
  } else if (mapping === "@PutMapping") {
    return "put";
  } else if (mapping === "@DeleteMapping") {
    return "delete";
  } else {
    return null;
  }
}

function fillTemplate(tsParameters) {
  const method = tsParameters.method;
  let type = tsParameters.type;
  if (
    type === "int" ||
    type === "long" ||
    type === "double" ||
    type === "float" ||
    type === "short"
  ) {
    type = "number";
  } else if (type === "String") {
    type = "string";
  }
  const name = tsParameters.name;
  const url = tsParameters.url;
  let returnType = tsParameters.returnType;
  let array = "";
  if (returnType.includes("<")) {
    returnType = returnType.split("<")[1].toString().split(">")[0];
    array = "[]";
  } else if (returnType.includes("void")) {
    returnType = "";
  }
  const methodType = tsParameters.methodType;

  const importTemplate =
    `import axios from "axios";\n` +
    'const BASEURL = "http://localhost:8080"\n\n';

  const template =
    `export async function ${methodType}${returnType}(${name !== undefined ? name + ":" : ""} ${type !== undefined ? type : ""}) {\n` +
    "  return axios\n" +
    `    .${methodType}(BASEURL + ${url}${method === "@PathVariable" ? `\+\`/\$\{${name}\}\`` : ""}${method === "@RequestParam" ? `\+\`?${name}=\$\{${name}\}\`` : ""}${method === "@RequestBody" ? ", " + name : ""})\n` +
    "    .then((res) => {\n" +
    `      return res.data ${returnType !== "" ? "as " + returnType + array : ""};\n` +
    "    })\n" +
    "    .catch((err) => {\n" +
    "      console.log(err);\n" +
    "      return undefined;\n" +
    "    });\n" +
    "}\n\n\n";

  if (!fs.existsSync(process.cwd().toString() + "-templates.ts")) {
    fs.writeFileSync(
      process.cwd().toString() + "-templates.ts",
      importTemplate,
    );
  }
  fs.appendFileSync(process.cwd().toString() + "-templates.ts", template);
}

checkForFiles();
