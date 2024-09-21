# Endpoint Scanner

This is a simple tool to scan for endpoints spring boot.

## Usage

To use this tool, you need to have a maven project with a pom.xml file.

You can run the tool by using the following command:

When pulling
```bash
node index.js
```

or

On the fly
```bash
npx endpointscanner@latest
```

This will scan the current directory for a pom.xml file and look for all the @RestController classes.

It will then generate a file called `-templates.ts` in the current directory.

The file will contain all the generated functions.