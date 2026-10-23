/**
 * scripts/build.mjs
 *
 * Bundles ShadowShield extension sources into dist/.
 * - Four JS entry points compiled as IIFE bundles.
 * - Static files (manifest.json, popup HTML/CSS) are copied verbatim.
 *
 * Usage:
 *   node scripts/build.mjs              # release build
 *   node scripts/build.mjs --watch      # watch (used by npm run dev)
 *   node scripts/build.mjs --dev        # dev build (DEBUG=true, watch)
 *
 * Flags:
 *   --watch   Enable esbuild watch mode.
 *   --dev     Set __SHADOWSHIELD_DEBUG__ = true (implies --watch).
 */

import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.resolve(__dirname, "..");
const SRC   = path.join(ROOT, "src");
const DIST  = path.join(ROOT, "dist");

const isDev   = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch") || isDev;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

function copyStatic() {
    copyFile(
        path.join(SRC, "manifest.json"),
        path.join(DIST, "manifest.json")
    );

    for (const file of ["popup.html", "popup.css"]) {
        copyFile(
            path.join(SRC, "popup", file),
            path.join(DIST, "popup", file)
        );
    }

    console.log("[build] Static files copied.");
}

// ---------------------------------------------------------------------------
// esbuild config
// ---------------------------------------------------------------------------

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
    bundle: true,
    format: "iife",
    target: ["firefox128", "chrome120"],
    logLevel: "info",
    define: {
        // Replaced at compile time — dead code is eliminated automatically.
        "__SHADOWSHIELD_DEBUG__": isDev ? "true" : "false"
    }
};

/** @type {import('esbuild').BuildOptions[]} */
const entries = [
    {
        ...sharedOptions,
        entryPoints: [path.join(SRC, "background", "index.js")],
        outfile: path.join(DIST, "background.js")
    },
    {
        ...sharedOptions,
        entryPoints: [path.join(SRC, "inject", "index.js")],
        outfile: path.join(DIST, "injection.js")
    },
    {
        ...sharedOptions,
        entryPoints: [path.join(SRC, "content", "bridge.js")],
        outfile: path.join(DIST, "content.js")
    },
    {
        ...sharedOptions,
        entryPoints: [path.join(SRC, "popup", "popup.js")],
        outfile: path.join(DIST, "popup", "popup.js")
    }
];

// ---------------------------------------------------------------------------
// Build / Watch
// ---------------------------------------------------------------------------

async function main() {
    ensureDir(DIST);
    ensureDir(path.join(DIST, "popup"));
    copyStatic();

    if (isWatch) {
        const contexts = await Promise.all(
            entries.map((opts) => esbuild.context(opts))
        );
        await Promise.all(contexts.map((ctx) => ctx.watch()));

        // Also watch static source files.
        const staticSources = [
            path.join(SRC, "manifest.json"),
            path.join(SRC, "popup", "popup.html"),
            path.join(SRC, "popup", "popup.css")
        ];
        for (const file of staticSources) {
            fs.watch(file, () => {
                console.log(
                    `[watch] Detected change in ${path.basename(file)}, copying…`
                );
                copyStatic();
            });
        }

        console.log(
            `[watch] DEBUG=${isDev}. Watching for changes… (Ctrl-C to stop)`
        );
    } else {
        await Promise.all(entries.map((opts) => esbuild.build(opts)));
        console.log("[build] Done.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
