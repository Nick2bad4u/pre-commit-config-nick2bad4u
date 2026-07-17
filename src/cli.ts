#!/usr/bin/env node

import * as path from "node:path";

import {
    materializePreCommitConfig,
    type PreCommitPreset,
    preCommitPresets,
} from "./pre-commit-config.js";

interface CliOptions {
    readonly check: boolean;
    readonly directory: string;
    readonly force: boolean;
    readonly preset: PreCommitPreset;
}

function parseArguments(arguments_: readonly string[]): CliOptions | undefined {
    if (arguments_.includes("--help")) {
        return undefined;
    }

    const command = arguments_.at(0);
    if (command !== "init") {
        throw new Error("Expected the `init` command.");
    }

    let isCheck = false;
    let directory = process.cwd();
    let isForce = false;
    let preset: PreCommitPreset = "node";

    for (let index = 1; index < arguments_.length; index += 1) {
        const argument = arguments_[index];
        switch (argument) {
            case "--check": {
                isCheck = true;
                break;
            }
            case "--directory": {
                directory = arguments_[index + 1] ?? "";
                index += 1;
                if (directory.length === 0) {
                    throw new Error("--directory requires a path.");
                }
                break;
            }
            case "--force": {
                isForce = true;
                break;
            }
            case "--preset": {
                preset = parsePreset(arguments_[index + 1]);
                index += 1;
                break;
            }
            case undefined:
            default: {
                throw new Error(`Unknown argument: ${String(argument)}`);
            }
        }
    }

    return { check: isCheck, directory, force: isForce, preset };
}

function parsePreset(value: string | undefined): PreCommitPreset {
    switch (value) {
        case "assets":
        case "minimal":
        case "node":
        case "security":
        case "strict": {
            return value;
        }
        case undefined:
        default: {
            throw new RangeError(
                `Invalid preset ${String(value)}. Expected one of: ${preCommitPresets.join(", ")}.`
            );
        }
    }
}

function usage(): string {
    return [
        "Usage: pre-commit-config-nick2bad4u init [options]",
        "",
        "Options:",
        `  --preset <name>       ${preCommitPresets.join(" | ")}`,
        "  --directory <path>   Consumer repository (default: current directory)",
        "  --check              Check drift without writing",
        "  --force              Replace a different existing file",
        "  --help               Show this help",
    ].join("\n");
}

async function run(): Promise<void> {
    const options = parseArguments(process.argv.slice(2));
    if (options === undefined) {
        process.stdout.write(`${usage()}\n`);
    } else {
        const result = await materializePreCommitConfig({
            check: options.check,
            force: options.force,
            preset: options.preset,
            targetDirectory: path.resolve(options.directory),
        });

        if (options.check && result.changed) {
            process.stderr.write(`Config drift detected: ${result.path}\n`);
            process.exitCode = 1;
        } else {
            process.stdout.write(
                `${result.changed ? "Wrote" : "Already current"}: ${result.path}\n` +
                    "Next: pre-commit install --install-hooks\n"
            );
        }
    }
}

try {
    await run();
} catch (error: unknown) {
    const message = getErrorMessage(error);
    process.stderr.write(`${message}\n\n${usage()}\n`);
    process.exitCode = 1;
}

function getErrorMessage(error: unknown): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return String(error);
}
