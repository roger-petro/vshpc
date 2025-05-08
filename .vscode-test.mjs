import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  label: "unitTests",
  files: "out/test/**/*.test.js",
  workspaceFolder: "L:\\res\\usuarios\\x0gd\\simuls\\caso_punq",
  mocha: {
    ui: "tdd",
    timeout: 20000,
  },
});
