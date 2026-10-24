import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lines = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function record(label, result, detail = "") {
    const prefix = result === "PASS" ? "PASS" : result === "WARN" ? "WARN" : "FAIL";
    if (result === "PASS") passed++;
    if (result === "WARN") warnings++;
    if (result === "FAIL") failed++;
    lines.push(`${prefix}: ${label}${detail ? ` — ${detail}` : ""}`);
}

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: "utf8",
        shell: true
    });
    return {
        code: result.status === null ? 1 : result.status,
        output: `${result.stdout || ""}${result.stderr || ""}`
    };
}

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
    return fs.existsSync(path.join(root, relativePath));
}

function checkCommand(label, command, args) {
    const result = run(command, args);
    record(label, result.code === 0 ? "PASS" : "FAIL", result.code === 0
        ? "completed successfully"
        : `exit code ${result.code}`);
    return result;
}

const build = checkCommand("npm run build", "npm", ["run", "build"]);
const lint = run("npm", ["run", "lint"]);
const lintErrors = Number((lint.output.match(/errors\s+(\d+)/) || [])[1] || 0);
const lintWarnings = Number((lint.output.match(/warnings\s+(\d+)/) || [])[1] || 0);
record(
    "npm run lint",
    lint.code === 0 && lintErrors === 0 && lintWarnings === 0 ? "PASS" : "FAIL",
    `exit code ${lint.code}, ${lintErrors} errors, ${lintWarnings} warnings`
);

const tests = run("npm", ["test"]);
const testPassed = (tests.output.match(/✔/g) || []).length;
const testFailed = (tests.output.match(/✖/g) || []).length;
record(
    "npm test",
    tests.code === 0 && testFailed === 0 ? "PASS" : "FAIL",
    `${testPassed} passed, ${testFailed} failed`
);

let manifest;
try {
    manifest = JSON.parse(read("dist/manifest.json"));
    const contentScripts = manifest.content_scripts || [];
    const framesValid = contentScripts.length > 0 &&
        contentScripts.every((entry) => entry.all_frames === true);
    const aboutBlankValid = contentScripts.length > 0 &&
        contentScripts.every((entry) => entry.match_about_blank === true);
    const permissions = manifest.permissions || [];
    const permissionsValid = ["tabs", "storage", "privacy"]
        .every((permission) => permissions.includes(permission));
    const packageVersion = JSON.parse(read("package.json")).version;
    const versionValid = manifest.version === packageVersion;

    record("dist manifest all_frames", framesValid ? "PASS" : "FAIL");
    record("dist manifest match_about_blank", aboutBlankValid ? "PASS" : "FAIL");
    record("dist manifest permissions", permissionsValid ? "PASS" : "FAIL");
    record("manifest/package version match", versionValid ? "PASS" : "FAIL");
} catch (error) {
    record("dist manifest checks", "FAIL", error.message);
}

for (const relativePath of [
    "dist/background.js",
    "dist/content.js",
    "dist/injection.js",
    "dist/popup/popup.html",
    "dist/popup/popup.css",
    "dist/popup/popup.js"
]) {
    record(`${relativePath} exists`, exists(relativePath) ? "PASS" : "FAIL");
}

const popupSource = ["popup.js", "popup.html", "popup.css"]
    .map((file) => read(`src/popup/${file}`))
    .join("\n");
record("no innerHTML in src/popup", !popupSource.includes("innerHTML") ? "PASS" : "FAIL");

const sourceFiles = [];
function collectJavaScript(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name);
        if (entry.isDirectory()) collectJavaScript(relative);
        else if (entry.name.endsWith(".js")) sourceFiles.push(relative);
    }
}
collectJavaScript("src");
const sourceText = sourceFiles.map((file) => read(file)).join("\n");
record(
    "no outbound network APIs in src",
    !/\b(fetch|XMLHttpRequest|WebSocket)\b/.test(sourceText) ? "PASS" : "FAIL"
);
record("legacy extension folder absent", !exists("extension") ? "PASS" : "FAIL");
record("legacy fingerprint test folder absent", !exists("tests/fingerprint-test") ? "PASS" : "FAIL");

const moduleFiles = fs.readdirSync(path.join(root, "src/inject/modules"))
    .filter((file) => file.endsWith(".js") && file !== "index.js");
for (const moduleFile of moduleFiles) {
    const documentation = `docs/modules/${moduleFile.replace(".js", ".md")}`;
    record(`${documentation} exists`, exists(documentation) ? "PASS" : "FAIL");
}

const markdownFiles = [
    "README.md",
    "CONTRIBUTING.md",
    "AGENTS.md",
    "CHANGELOG.md",
    ...fs.readdirSync(path.join(root, "docs"), { recursive: true })
        .filter((file) => file.endsWith(".md"))
        .map((file) => path.join("docs", file))
];
let brokenLinks = 0;
for (const markdownFile of markdownFiles) {
    const markdown = read(markdownFile);
    const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(markdown))) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        if (!fs.existsSync(path.resolve(root, path.dirname(markdownFile), target))) {
            brokenLinks++;
        }
    }
}
record("relative Markdown links resolve", brokenLinks === 0 ? "PASS" : "FAIL", `${brokenLinks} broken`);

const changelog = read("CHANGELOG.md");
for (const keyword of ["iframe", "WebRTC", "popup", "unit tests", "verify script", "test-page server"]) {
    record(
        `changelog mentions ${keyword}`,
        changelog.toLowerCase().includes(keyword.toLowerCase()) ? "PASS" : "FAIL"
    );
}
record(
    "status progress checklist exists",
    read("docs/STATUS.md").includes("## Quick-wins batch 1 progress") ? "PASS" : "FAIL"
);

const branch = run("git", ["branch", "--show-current"]).output.trim();
const commit = run("git", ["rev-parse", "--short", "HEAD"]).output.trim();
const nodeVersion = process.version;
const report = [
    "==== SHADOWSHIELD VERIFY SUMMARY ====",
    `Date: ${new Date().toISOString()}`,
    `Node: ${nodeVersion}`,
    `Branch: ${branch}`,
    `Commit: ${commit}`,
    ...lines,
    `RESULT: ${passed} passed, ${failed} failed, ${warnings} warnings`,
    "",
    "NEEDS MANUAL CHECK",
    "1. npm run build, then reload ShadowShield in about:debugging.",
    "2. npm run test:pages, open http://127.0.0.1:8000/iframe-test/ -> the popup should list",
    "   http://127.0.0.1:8001 under \"Embedded sources\" for the site 127.0.0.1:8000.",
    "3. Open http://127.0.0.1:8000/iframe-test/blank-frame.html and note MATCH or MISMATCH.",
    "4. Popup > Settings: WebRTC status should read \"Active\". Open browserleaks.com/webrtc with",
    "   the toggle ON and OFF and compare (local address may already be hidden by Firefox).",
    "5. Popup visual check: light and dark mode, a very long hostname, empty state after",
    "   \"Clear data\", no horizontal scrollbar, no overlapping text.",
    "6. Regression: browserleaks.com/javascript still shows Linux Firefox, 6 cores, ru-RU, Moscow."
].join("\n");

fs.writeFileSync(path.join(root, "verify-report.txt"), `${report}\n`);
console.log(report);
if (build.code !== 0 || failed > 0) process.exitCode = 1;
