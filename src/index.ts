import inquirer from "inquirer";
import { execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to safely execute shell commands
const runCommand = (command: string, errorMessage: string) => {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, (error as Error).message);
    process.exit(1); // Exit the script on failure
  }
};

// Function to check if a file exists
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

class Command {
  static async setupProject() {
    console.log("\n🚀 Starting React Project Setup...\n");

    // Prompt user for project name
    let { projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Enter project name:",
        validate: (input) =>
          input.trim() ? true : "Project name cannot be empty!",
      },
    ]);

    projectName = projectName.replace(/\s/g, "-"); // Replace spaces with hyphens
    console.log(`\n📦 Creating React-Vite project: ${projectName}...\n`);

    runCommand(
      `npm create vite@latest ${projectName} -- --template react-ts`,
      "Failed to create Vite project"
    );

    // Navigate to project directory
    process.chdir(projectName);

    // Install dependencies
    console.log("\n📌 Installing dependencies...\n");
    runCommand("npm install", "Failed to install dependencies");

    // Prompt to install Tailwind CSS
    const { installTailwind } = await inquirer.prompt([
      {
        type: "confirm",
        name: "installTailwind",
        message: "Do you want to install Tailwind CSS? (v3 supported)",
        default: true,
      },
    ]);

    if (installTailwind) {
      console.log("\n🎨 Installing Tailwind CSS...\n");
      runCommand(
        "npm install -D tailwindcss@3 postcss autoprefixer",
        "Failed to install Tailwind CSS"
      );
      runCommand(
        "npx tailwindcss init -p",
        "Failed to initialize Tailwind CSS"
      );

      // Update Tailwind config
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

      // Update index.css
      const cssFilePath = path.resolve(process.cwd(), "src/index.css");
      const cssContent = `@tailwind base;\n@tailwind components;\n@tailwind utilities;`;
      await fs.writeFile(cssFilePath, cssContent);
      console.log("✅ Tailwind CSS setup completed!\n");

      // Install ShadCN if Tailwind was installed
      const { installShadcn } = await inquirer.prompt([
        {
          type: "confirm",
          name: "installShadcn",
          message: "Do you want to install ShadCN?",
          default: false,
        },
      ]);

      if (installShadcn) {
        console.log("\n🛠 Setting up ShadCN...\n");

        try {
          runCommand(
            "npm install -D @types/node",
            "Failed to install ShadCN dependencies"
          );

          // Update tsconfig.json for path aliases
          const tsConfigPath = "tsconfig.json";
          if (await fileExists(tsConfigPath)) {
            const tsConfig = JSON.parse(
              await fs.readFile(tsConfigPath, "utf-8")
            );
            tsConfig.compilerOptions = tsConfig.compilerOptions || {};
            tsConfig.compilerOptions.baseUrl = ".";
            tsConfig.compilerOptions.paths = { "@/*": ["./src/*"] };
            await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
          }

          // Update vite.config.ts for aliasing
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

          // Initialize ShadCN
          runCommand("npx shadcn@latest init", "Failed to initialize ShadCN");
          console.log("✅ ShadCN setup completed!\n");
        } catch (error) {
          console.error(
            "❌ Error setting up ShadCN:",
            (error as Error).message
          );
        }
      }
    }

    // Prompt for project cleanup
    const { cleanupProject } = await inquirer.prompt([
      {
        type: "confirm",
        name: "cleanupProject",
        message: "Do you want to clean up the project for quick start?",
        default: true,
      },
    ]);

    if (cleanupProject) {
      console.log("\n🧹 Cleaning up project files...\n");

      const appContent = installTailwind
        ? appContentWhenTailwind
        : appContentWhenNotTailwind;
      await fs.writeFile("src/App.tsx", appContent);

      // Remove App.css if it exists
      const appCssPath = "src/App.css";
      if (await fileExists(appCssPath)) {
        await fs.unlink(appCssPath);
      }

      console.log("✅ Project cleanup completed!\n");
    }

    // Start the development server
    console.log("\n🎉 Project setup completed successfully!");
    console.log("\n🚀 Starting development server...\n");
    runCommand("npm run dev", "Failed to start the development server");
  }
}

// Execute the setup process
Command.setupProject().catch((error) => {
  console.error("❌ An unexpected error occurred:", error.message);
  process.exit(1);
});
