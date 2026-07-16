import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/** Supported pre-commit policy presets. */
export type PreCommitPreset =
    | "assets"
    | "minimal"
    | "node"
    | "security"
    | "strict";

/** All bundled pre-commit preset names. */
export const preCommitPresets: readonly PreCommitPreset[] = Object.freeze([
    "node",
    "minimal",
    "security",
    "strict",
    "assets",
]);

const paths: Readonly<Record<PreCommitPreset, string>> = Object.freeze({
    assets: fileURLToPath(new URL("../configs/assets.yaml", import.meta.url)),
    minimal: fileURLToPath(new URL("../configs/minimal.yaml", import.meta.url)),
    node: fileURLToPath(new URL("../.pre-commit-config.yaml", import.meta.url)),
    security: fileURLToPath(
        new URL("../configs/security.yaml", import.meta.url)
    ),
    strict: fileURLToPath(new URL("../configs/strict.yaml", import.meta.url)),
});

/** Absolute path to the default Node preset. */
export const preCommitConfigPath: string = paths.node;

/** Immutable mapping from preset names to package-owned absolute paths. */
export const preCommitConfigPaths: Readonly<Record<PreCommitPreset, string>> =
    paths;

/** Options for checking or materializing a consumer config. */
export interface MaterializeOptions {
    /** Check for drift without writing. */
    readonly check?: boolean;
    /** Allow replacement of a different existing config. */
    readonly force?: boolean;
    /** Preset to materialize. */
    readonly preset?: PreCommitPreset;
    /** Consumer repository directory. */
    readonly targetDirectory?: string;
}

/** Result of checking or materializing a consumer config. */
export interface MaterializeResult {
    /** Whether the target differs from the selected preset. */
    readonly changed: boolean;
    /** Absolute path to the consumer config. */
    readonly path: string;
}

/**
 * Resolve one bundled pre-commit config to an absolute filesystem path.
 *
 * @throws RangeError if `preset` is not a bundled preset name.
 */
export function getPreCommitConfigPath(
    preset: PreCommitPreset = "node"
): string {
    switch (preset) {
        case "assets":
        case "minimal":
        case "node":
        case "security":
        case "strict": {
            return paths[preset];
        }
        default: {
            throw new RangeError(
                "Unknown pre-commit preset. Expected one of: node, minimal, security, strict, assets."
            );
        }
    }
}

/** Load one bundled pre-commit config as YAML text. */
export async function loadPreCommitConfig(
    preset: PreCommitPreset = "node"
): Promise<string> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- The resolver returns only package-owned preset paths.
    return readFile(getPreCommitConfigPath(preset), "utf8");
}

/**
 * Copy a selected preset to the consumer's conventional root filename.
 *
 * Existing differing files are never replaced unless `force` is true.
 *
 * @throws Error if a differing target exists and `force` is false.
 */
export async function materializePreCommitConfig(
    options: MaterializeOptions = {}
): Promise<MaterializeResult> {
    const {
        check = false,
        force = false,
        preset = "node",
        targetDirectory = process.cwd(),
    } = options;
    const targetPath = path.resolve(targetDirectory, ".pre-commit-config.yaml");
    const desired = await loadPreCommitConfig(preset);
    const existing = await readExisting(targetPath);
    const isChanged = existing !== desired;

    if (check || !isChanged) {
        return { changed: isChanged, path: targetPath };
    }

    if (existing !== undefined && !force) {
        throw new Error(
            `Refusing to replace ${targetPath}. Re-run with force enabled after reviewing the diff.`
        );
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Target path uses the caller-selected directory and a fixed filename.
    await writeFile(targetPath, desired, {
        encoding: "utf8",
        flag: force ? "w" : "wx",
    });

    return { changed: true, path: targetPath };
}

function isErrorWithCode(error: unknown): error is Error & { code: string } {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
    );
}

async function readExisting(targetPath: string): Promise<string | undefined> {
    try {
        await access(targetPath, constants.F_OK);
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- Target path is constrained to the fixed materializer filename.
        return await readFile(targetPath, "utf8");
    } catch (error: unknown) {
        if (isErrorWithCode(error) && error.code === "ENOENT") {
            return undefined;
        }

        throw error;
    }
}

export default preCommitConfigPath;
