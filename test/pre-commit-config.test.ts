import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
    getPreCommitConfigPath,
    loadPreCommitConfig,
    materializePreCommitConfig,
    preCommitConfigPath,
    preCommitConfigPaths,
    type PreCommitPreset,
    preCommitPresets,
} from "../src/pre-commit-config.js";

interface Hook {
    readonly alias?: string;
    readonly args?: readonly string[];
    readonly files?: string;
    readonly id: string;
}

interface HookRepository {
    readonly hooks: readonly Hook[];
    readonly repo: string;
    readonly rev: string;
}

interface PreCommitConfig {
    readonly default_stages: readonly string[];
    readonly repos: readonly HookRepository[];
}

describe("pre-commit shared presets", () => {
    it.each(preCommitPresets)("loads the %s preset", async (preset) => {
        expect.assertions(6);

        const configPath = getPreCommitConfigPath(preset);
        const source = await loadPreCommitConfig(preset);
        const config = parse(source) as PreCommitConfig;

        expect(path.isAbsolute(configPath)).toBe(true);
        expect(configPath).toBe(preCommitConfigPaths[preset]);
        expect(source.endsWith("\n")).toBe(true);
        expect(config.default_stages).toStrictEqual(["pre-commit"]);
        expect(config.repos.length).toBeGreaterThan(0);
        expect(
            config.repos.every(({ rev }) => /^[0-9a-f]{40}$/v.test(rev))
        ).toBe(true);
    });

    it("keeps package and tsconfig schemas mapped correctly", async () => {
        expect.assertions(4);

        const config = parse(
            await loadPreCommitConfig("node")
        ) as PreCommitConfig;
        const schemaHooks = config.repos
            .flatMap(({ hooks }) => hooks)
            .filter(({ id }) => id === "check-jsonschema");
        const packageHook = schemaHooks.find(
            ({ alias }) => alias === "check-package-json-schema"
        );
        const tsconfigHook = schemaHooks.find(
            ({ alias }) => alias === "check-tsconfig-schema"
        );

        expect(packageHook?.args).toContain(
            "https://json.schemastore.org/package.json"
        );
        expect(packageHook?.files).toContain(String.raw`package\.json`);
        expect(tsconfigHook?.args).toContain(
            "https://json.schemastore.org/tsconfig.json"
        );
        expect(tsconfigHook?.files).toContain("tsconfig");
    });

    it("rejects unknown presets at runtime", () => {
        expect.assertions(1);

        expect(() =>
            getPreCommitConfigPath("invented" as PreCommitPreset)
        ).toThrow(RangeError);
    });

    it("materializes idempotently and refuses an implicit overwrite", async () => {
        expect.assertions(8);

        const directory = await mkdtemp(
            path.join(tmpdir(), "precommit-config-")
        );
        const target = path.join(directory, ".pre-commit-config.yaml");

        try {
            const first = await materializePreCommitConfig({
                preset: "security",
                targetDirectory: directory,
            });

            expect(first).toStrictEqual({ changed: true, path: target });
            await expect(readFile(target, "utf8")).resolves.toBe(
                await loadPreCommitConfig("security")
            );

            const second = await materializePreCommitConfig({
                preset: "security",
                targetDirectory: directory,
            });

            expect(second.changed).toBe(false);

            await writeFile(target, "consumer-owned: true\n", "utf8");

            await expect(
                materializePreCommitConfig({
                    preset: "node",
                    targetDirectory: directory,
                })
            ).rejects.toThrow("Refusing to replace");

            const check = await materializePreCommitConfig({
                check: true,
                preset: "node",
                targetDirectory: directory,
            });

            expect(check.changed).toBe(true);
            await expect(readFile(target, "utf8")).resolves.toBe(
                "consumer-owned: true\n"
            );

            const forced = await materializePreCommitConfig({
                force: true,
                preset: "node",
                targetDirectory: directory,
            });

            expect(forced.changed).toBe(true);
            await expect(readFile(target, "utf8")).resolves.toBe(
                await loadPreCommitConfig("node")
            );
        } finally {
            await rm(directory, { force: true, recursive: true });
        }
    });

    it("provides a working materializer CLI", () => {
        expect.assertions(4);

        const cliPath = fileURLToPath(
            new URL("../dist/cli.js", import.meta.url)
        );
        const result = spawnSync(process.execPath, [cliPath, "--help"], {
            encoding: "utf8",
        });

        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toContain("init [options]");
        expect(preCommitConfigPath).toBe(getPreCommitConfigPath("node"));
    });
});
