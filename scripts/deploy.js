const { execSync } = require("child_process");

const message = process.argv.slice(2).join(" ") || `Update FocusForge [${new Date().toISOString()}]`;

console.log("\n==============================================");
console.log("🚀 FOCUSFORGE AUTO-DEPLOY SYSTEM");
console.log("==============================================\n");
console.log(`📝 Commit Message: "${message}"\n`);

try {
  console.log("1️⃣  Staging files (git add .)...");
  execSync("git add .", { stdio: "inherit" });

  try {
    console.log("\n2️⃣  Committing changes...");
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
  } catch {
    console.log("ℹ️  No changes to commit or working tree clean.");
  }

  console.log("\n3️⃣  Pushing to GitHub (origin main)...");
  execSync("git push origin main", { stdio: "inherit" });

  console.log("\n==============================================");
  console.log("✅ Successfully pushed to GitHub!");
  console.log("⚡ Vercel will now automatically build & deploy.");
  console.log("📱 All users on Website and Installed App (PWA)");
  console.log("   will auto-receive this update seamlessly!");
  console.log("==============================================\n");
} catch (error) {
  console.error("\n❌ Deployment failed:", error.message);
  process.exit(1);
}
