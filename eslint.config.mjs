import nickTwoBadFourU from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nickTwoBadFourU.configs.all,

    {
        files: ["src/**/*.ts"],
        rules: {
            "typefest/prefer-ts-extras-array-at": "off",
            "typefest/prefer-ts-extras-array-includes": "off",
            "typefest/prefer-ts-extras-array-join": "off",
            "typefest/prefer-ts-extras-is-defined": "off",
            "typefest/prefer-ts-extras-key-in": "off",
            "typefest/prefer-ts-extras-object-has-own": "off",
            "typefest/prefer-ts-extras-object-values": "off",
        },
    },
    {
        files: ["src/cli.ts"],
        rules: {
            "n/hashbang": "off",
            // The bin-only entrypoint can await startup without delaying library imports.
            "n/no-top-level-await": "off",
            "perfectionist/sort-modules": "off",
            "unicorn/no-break-in-nested-loop": "off",
        },
    },
    {
        files: [".pre-commit-config.yaml", "configs/**/*.yaml"],
        rules: {
            "yml/block-sequence": "off",
            "yml/sort-keys": "off",
        },
    },
];

export default config;
