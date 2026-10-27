import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("src/manifest.json", "utf8"));

test("one manifest runs the background in Firefox and Chromium", () => {
    // Firefox runs the "scripts" list; Chromium runs "service_worker" and ignores
    // "scripts". Both keys must be present (decision 0008).
    assert.ok(Array.isArray(manifest.background.scripts));
    assert.ok(manifest.background.scripts.length > 0);
    assert.equal(manifest.background.service_worker, "service-worker.js");
});

test("every list of blocking rules named in the manifest exists in the source", () => {
    const resources = manifest.declarative_net_request.rule_resources;
    assert.ok(resources.length > 0);
    for (const resource of resources) {
        assert.ok(
            fs.existsSync(`src/blocking/${resource.path}`),
            `${resource.path} is missing from src/blocking/`
        );
    }
});
