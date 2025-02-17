#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import { execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runCommand = (command: string, errorMessage: string) => {
  try {
    console.log(`\n🔹 Running: ${command}`);
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, (error as Error).message);
    process.exit(1);
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const appContentWhenTailwind = `export default function App() {
  return (
    <h1 className="text-3xl font-bold underline">
      Hello world!
    </h1>
  );
}`;

const appContentWhenNotTailwind = `export default function App() {
  return (
    <h1>
      Hello world!
    </h1>
  );
}`;

const setupProject = async (projectName: string, options: any) => {
  console.log("\n🚀 Starting React Project Setup...\n");

  projectName = projectName.replace(/\s/g, "-");
  console.log(`📦 Creating React-Vite project: ${projectName}...\n`);

  runCommand(
    `npm create vite@latest ${projectName} -- --template react-ts`,
    "Failed to create Vite project"
  );

  process.chdir(projectName);
  console.log("\n📌 Installing dependencies...\n");
  runCommand("npm install", "Failed to install dependencies");

  let installTailwind = options.tailwind ?? false;
  let installShadcn = options.shadcn ?? false;
  let cleanupProject = options.clean ?? false;

  if (!options.tailwind && !options.shadcn && !options.clean) {
    const responses = await inquirer.prompt([
      {
        type: "confirm",
        name: "installTailwind",
        message: "Do you want to install Tailwind CSS? (v3 supported)",
        default: true,
      },
      {
        type: "confirm",
        name: "installShadcn",
        message: "Do you want to install ShadCN?",
        default: false,
      },
      {
        type: "confirm",
        name: "cleanupProject",
        message: "Do you want to clean up the project for quick start?",
        default: true,
      },
    ]);

    installTailwind = responses.installTailwind;
    installShadcn = responses.installShadcn;
    cleanupProject = responses.cleanupProject;
  }

  if (installTailwind) {
    console.log("\n🎨 Installing Tailwind CSS...\n");
    runCommand(
      "npm install -D tailwindcss@3 postcss autoprefixer",
      "Failed to install Tailwind CSS"
    );
    runCommand("npx tailwindcss init -p", "Failed to initialize Tailwind CSS");

    const tailwindConfigPath = path.resolve(
      process.cwd(),
      "tailwind.config.js"
    );
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`;
    await fs.writeFile(tailwindConfigPath, tailwindConfig);

    const cssFilePath = path.resolve(process.cwd(), "src/index.css");
    const cssContent = `@tailwind base;\n@tailwind components;\n@tailwind utilities;`;
    await fs.writeFile(cssFilePath, cssContent);
    console.log("✅ Tailwind CSS setup completed!\n");
  }

  if (installShadcn) {
    console.log("\n🛠 Setting up ShadCN...\n");
    runCommand(
      "npm install -D @types/node",
      "Failed to install ShadCN dependencies"
    );

    const tsConfigPath = "tsconfig.json";
    if (await fileExists(tsConfigPath)) {
      const tsConfig = JSON.parse(await fs.readFile(tsConfigPath, "utf-8"));
      tsConfig.compilerOptions = tsConfig.compilerOptions || {};
      tsConfig.compilerOptions.baseUrl = ".";
      tsConfig.compilerOptions.paths = { "@/*": ["./src/*"] };
      await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    }

    const viteConfigPath = "vite.config.ts";
    const viteConfig = `import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});`;
    await fs.writeFile(viteConfigPath, viteConfig);

    runCommand("npx shadcn@latest init", "Failed to initialize ShadCN");
    console.log("✅ ShadCN setup completed!\n");
  }

  if (cleanupProject) {
    console.log("\n🧹 Cleaning up project files...\n");
    const appContent = installTailwind
      ? appContentWhenTailwind
      : appContentWhenNotTailwind;
    await fs.writeFile("src/App.tsx", appContent);

    const appCssPath = "src/App.css";
    if (await fileExists(appCssPath)) {
      await fs.unlink(appCssPath);
    }

    console.log("✅ Project cleanup completed!\n");
  }

  console.log("\n🎉 Project setup completed successfully!");
  console.log("\n🚀 Starting development server...\n");
  runCommand("npm run dev", "Failed to start the development server");
};

const program = new Command();
program
  .name("create-react-vite-app")
  .description(
    "CLI to set up a React + Vite project with optional Tailwind CSS and ShadCN"
  )
  .version("1.0.0");

program
  .command("create <projectName>")
  .description("Create a new React + Vite project")
  .option("--tailwind", "Install Tailwind CSS")
  .option("--shadcn", "Install ShadCN")
  .option("--clean", "Clean up project files for a quick start")
  .action(async (projectName, options) => {
    await setupProject(projectName, options);
  });

program.parse(process.argv);
