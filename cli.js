#!/usr/bin/env node

import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Command {
  static async setupProject() {
    console.log("Starting React Project Setup...\n");

    // Prompt user for project name
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter project name:',
      }
    ]);

    console.log(`Creating Vite project: ${projectName}...\n`);
    execSync(`npm create vite@latest ${projectName} -- --template react-ts`, { stdio: 'inherit' });

    // Navigate to project directory
    process.chdir(projectName);

    // Install dependencies
    console.log("Installing dependencies...\n");
    execSync(`npm install`, { stdio: 'inherit' });

    // Prompt to install Tailwind CSS
    const { installTailwind } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installTailwind',
        message: 'Do you want to install Tailwind CSS? Currently Supports v3',
        default: true
      }
    ]);

    if (installTailwind) {
      console.log("Installing Tailwind CSS...\n");
      execSync(`npm install -D tailwindcss@3 postcss autoprefixer`, { stdio: 'inherit' });

      console.log("Initializing Tailwind CSS...\n");
      execSync(`npx tailwindcss init -p`, { stdio: 'inherit' });

      // Update tailwind.config.js
      const tailwindConfigPath = path.resolve(process.cwd(), 'tailwind.config.js');

      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

      await fs.writeFile(tailwindConfigPath, tailwindConfig);

      // Add the Tailwind directives to your CSS
      const cssFilePath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

      await fs.writeFile(cssFilePath, cssContent);
      console.log("Tailwind CSS setup completed!\n");
    }

    // Prompt to install ShadCN
    const { installShadcn } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installShadcn',
        message: 'Do you want to install ShadCN?',
        default: false
      }
    ]);

    if (installShadcn) {
      console.log("Setting up ShadCN...\n");

      try {
        // Install required dependencies first
        console.log("Installing dependencies...");
        execSync(`npm install -D @types/node`, { stdio: 'inherit' });

        // Update tsconfig.json
        console.log("Updating TypeScript configuration...");
        const tsConfig = {
          files: [],
          references: [
            { path: "./tsconfig.app.json" },
            { path: "./tsconfig.node.json" }
          ],
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "@/*": ["./src/*"]
            }
          }
        };
        await fs.writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));

        // get the tsconfig.app.json file, in compilerOptions key add "baseUrl": ".",    "paths": {"@/*": ["./src/*"]} 
        const tsConfigApp = {
          extends: "./tsconfig.json",
          compilerOptions: {
            target: "esnext",
            module: "esnext",
            jsx: "react-jsx",
            strict: true,
            moduleResolution: "node",
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            incremental: true
          },
          include: ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.js"],
          exclude: ["node_modules"]
        };

        await fs.writeFile('tsconfig.app.json', JSON.stringify(tsConfigApp, null, 2));

        // Update vite.config.ts
        const viteConfig = `import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})`;
        await fs.writeFile('vite.config.ts', viteConfig);

        // Initialize ShadCN with the correct command
        console.log("Installing ShadCN...\n");
        // execSync(`npm install shadcn-ui`, { stdio: 'inherit' }); // Install shadcn-ui package first
        execSync(`npx shadcn@latest init`, { stdio: 'inherit' });
        console.log("ShadCN setup completed!\n");
      } catch (error) {
        console.error("Error setting up ShadCN:", error.message);
        console.log("ShadCN setup failed!\n");
      }
    }

    console.log("\n✅ Project setup completed! Start building your React app 🚀\n");
    console.log(`Run the following commands:\n`);
    console.log(`cd ${projectName}`);
    console.log(`npm run dev`);
  }
}

// Execute the setup process
Command.setupProject().catch(console.error);
