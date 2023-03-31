// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Command line arguments parser based on
 * [minimist](https://github.com/minimistjs/minimist).
 *
 * This module is browser compatible.
 *
 * @example
 * ```ts
 * import { parse } from "https://deno.land/std@$STD_VERSION/flags/mod.ts";
 *
 * console.dir(parse(Deno.args));
 * ```
 *
 * ```sh
 * $ deno run https://deno.land/std/examples/flags.ts -a beep -b boop
 * { _: [], a: 'beep', b: 'boop' }
 * ```
 *
 * ```sh
 * $ deno run https://deno.land/std/examples/flags.ts -x 3 -y 4 -n5 -abc --beep=boop foo bar baz
 * { _: [ 'foo', 'bar', 'baz' ],
 *   x: 3,
 *   y: 4,
 *   n: 5,
 *   a: true,
 *   b: true,
 *   c: true,
 *   beep: 'boop' }
 * ```
 *
 * @module
 */ import { assert } from "../_util/asserts.ts";
const { hasOwn  } = Object;
function get(obj, key) {
    if (hasOwn(obj, key)) {
        return obj[key];
    }
}
function getForce(obj, key) {
    const v = get(obj, key);
    assert(v != null);
    return v;
}
function isNumber(x) {
    if (typeof x === "number") return true;
    if (/^0x[0-9a-f]+$/i.test(String(x))) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(String(x));
}
function hasKey(obj, keys) {
    let o = obj;
    keys.slice(0, -1).forEach((key)=>{
        o = get(o, key) ?? {};
    });
    const key = keys[keys.length - 1];
    return hasOwn(o, key);
}
/** Take a set of command line arguments, optionally with a set of options, and
 * return an object representing the flags found in the passed arguments.
 *
 * By default, any arguments starting with `-` or `--` are considered boolean
 * flags. If the argument name is followed by an equal sign (`=`) it is
 * considered a key-value pair. Any arguments which could not be parsed are
 * available in the `_` property of the returned object.
 *
 * By default, the flags module tries to determine the type of all arguments
 * automatically and the return type of the `parse` method will have an index
 * signature with `any` as value (`{ [x: string]: any }`).
 *
 * If the `string`, `boolean` or `collect` option is set, the return value of
 * the `parse` method will be fully typed and the index signature of the return
 * type will change to `{ [x: string]: unknown }`.
 *
 * Any arguments after `'--'` will not be parsed and will end up in `parsedArgs._`.
 *
 * Numeric-looking arguments will be returned as numbers unless `options.string`
 * or `options.boolean` is set for that argument name.
 *
 * @example
 * ```ts
 * import { parse } from "https://deno.land/std@$STD_VERSION/flags/mod.ts";
 * const parsedArgs = parse(Deno.args);
 * ```
 *
 * @example
 * ```ts
 * import { parse } from "https://deno.land/std@$STD_VERSION/flags/mod.ts";
 * const parsedArgs = parse(["--foo", "--bar=baz", "./quux.txt"]);
 * // parsedArgs: { foo: true, bar: "baz", _: ["./quux.txt"] }
 * ```
 */ export function parse(args, { "--": doubleDash = false , alias ={} , boolean =false , default: defaults = {} , stopEarly =false , string =[] , collect =[] , negatable =[] , unknown =(i)=>i  } = {}) {
    const aliases = {};
    const flags = {
        bools: {},
        strings: {},
        unknownFn: unknown,
        allBools: false,
        collect: {},
        negatable: {}
    };
    if (alias !== undefined) {
        for(const key in alias){
            const val = getForce(alias, key);
            if (typeof val === "string") {
                aliases[key] = [
                    val
                ];
            } else {
                aliases[key] = val;
            }
            for (const alias1 of getForce(aliases, key)){
                aliases[alias1] = [
                    key
                ].concat(aliases[key].filter((y)=>alias1 !== y));
            }
        }
    }
    if (boolean !== undefined) {
        if (typeof boolean === "boolean") {
            flags.allBools = !!boolean;
        } else {
            const booleanArgs = typeof boolean === "string" ? [
                boolean
            ] : boolean;
            for (const key1 of booleanArgs.filter(Boolean)){
                flags.bools[key1] = true;
                const alias2 = get(aliases, key1);
                if (alias2) {
                    for (const al of alias2){
                        flags.bools[al] = true;
                    }
                }
            }
        }
    }
    if (string !== undefined) {
        const stringArgs = typeof string === "string" ? [
            string
        ] : string;
        for (const key2 of stringArgs.filter(Boolean)){
            flags.strings[key2] = true;
            const alias3 = get(aliases, key2);
            if (alias3) {
                for (const al1 of alias3){
                    flags.strings[al1] = true;
                }
            }
        }
    }
    if (collect !== undefined) {
        const collectArgs = typeof collect === "string" ? [
            collect
        ] : collect;
        for (const key3 of collectArgs.filter(Boolean)){
            flags.collect[key3] = true;
            const alias4 = get(aliases, key3);
            if (alias4) {
                for (const al2 of alias4){
                    flags.collect[al2] = true;
                }
            }
        }
    }
    if (negatable !== undefined) {
        const negatableArgs = typeof negatable === "string" ? [
            negatable
        ] : negatable;
        for (const key4 of negatableArgs.filter(Boolean)){
            flags.negatable[key4] = true;
            const alias5 = get(aliases, key4);
            if (alias5) {
                for (const al3 of alias5){
                    flags.negatable[al3] = true;
                }
            }
        }
    }
    const argv = {
        _: []
    };
    function argDefined(key, arg) {
        return flags.allBools && /^--[^=]+$/.test(arg) || get(flags.bools, key) || !!get(flags.strings, key) || !!get(aliases, key);
    }
    function setKey(obj, name, value, collect = true) {
        let o = obj;
        const keys = name.split(".");
        keys.slice(0, -1).forEach(function(key) {
            if (get(o, key) === undefined) {
                o[key] = {};
            }
            o = get(o, key);
        });
        const key = keys[keys.length - 1];
        const collectable = collect && !!get(flags.collect, name);
        if (!collectable) {
            o[key] = value;
        } else if (get(o, key) === undefined) {
            o[key] = [
                value
            ];
        } else if (Array.isArray(get(o, key))) {
            o[key].push(value);
        } else {
            o[key] = [
                get(o, key),
                value
            ];
        }
    }
    function setArg(key, val, arg = undefined, collect) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg, key, val) === false) return;
        }
        const value = !get(flags.strings, key) && isNumber(val) ? Number(val) : val;
        setKey(argv, key, value, collect);
        const alias = get(aliases, key);
        if (alias) {
            for (const x of alias){
                setKey(argv, x, value, collect);
            }
        }
    }
    function aliasIsBoolean(key) {
        return getForce(aliases, key).some((x)=>typeof get(flags.bools, x) === "boolean");
    }
    let notFlags = [];
    // all args after "--" are not parsed
    if (args.includes("--")) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
    }
    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
            const m = arg.match(/^--([^=]+)=(.*)$/s);
            assert(m != null);
            const [, key5, value] = m;
            if (flags.bools[key5]) {
                const booleanValue = value !== "false";
                setArg(key5, booleanValue, arg);
            } else {
                setArg(key5, value, arg);
            }
        } else if (/^--no-.+/.test(arg) && get(flags.negatable, arg.replace(/^--no-/, ""))) {
            const m1 = arg.match(/^--no-(.+)/);
            assert(m1 != null);
            setArg(m1[1], false, arg, false);
        } else if (/^--.+/.test(arg)) {
            const m2 = arg.match(/^--(.+)/);
            assert(m2 != null);
            const [, key6] = m2;
            const next = args[i + 1];
            if (next !== undefined && !/^-/.test(next) && !get(flags.bools, key6) && !flags.allBools && (get(aliases, key6) ? !aliasIsBoolean(key6) : true)) {
                setArg(key6, next, arg);
                i++;
            } else if (/^(true|false)$/.test(next)) {
                setArg(key6, next === "true", arg);
                i++;
            } else {
                setArg(key6, get(flags.strings, key6) ? "" : true, arg);
            }
        } else if (/^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split("");
            let broken = false;
            for(let j = 0; j < letters.length; j++){
                const next1 = arg.slice(j + 2);
                if (next1 === "-") {
                    setArg(letters[j], next1, arg);
                    continue;
                }
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next1)) {
                    setArg(letters[j], next1.split(/=(.+)/)[1], arg);
                    broken = true;
                    break;
                }
                if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next1)) {
                    setArg(letters[j], next1, arg);
                    broken = true;
                    break;
                }
                if (letters[j + 1] && letters[j + 1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);
                    broken = true;
                    break;
                } else {
                    setArg(letters[j], get(flags.strings, letters[j]) ? "" : true, arg);
                }
            }
            const [key7] = arg.slice(-1);
            if (!broken && key7 !== "-") {
                if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !get(flags.bools, key7) && (get(aliases, key7) ? !aliasIsBoolean(key7) : true)) {
                    setArg(key7, args[i + 1], arg);
                    i++;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
                    setArg(key7, args[i + 1] === "true", arg);
                    i++;
                } else {
                    setArg(key7, get(flags.strings, key7) ? "" : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(flags.strings["_"] ?? !isNumber(arg) ? arg : Number(arg));
            }
            if (stopEarly) {
                argv._.push(...args.slice(i + 1));
                break;
            }
        }
    }
    for (const [key8, value1] of Object.entries(defaults)){
        if (!hasKey(argv, key8.split("."))) {
            setKey(argv, key8, value1);
            if (aliases[key8]) {
                for (const x of aliases[key8]){
                    setKey(argv, x, value1);
                }
            }
        }
    }
    for (const key9 of Object.keys(flags.bools)){
        if (!hasKey(argv, key9.split("."))) {
            const value2 = get(flags.collect, key9) ? [] : false;
            setKey(argv, key9, value2, false);
        }
    }
    for (const key10 of Object.keys(flags.strings)){
        if (!hasKey(argv, key10.split(".")) && get(flags.collect, key10)) {
            setKey(argv, key10, [], false);
        }
    }
    if (doubleDash) {
        argv["--"] = [];
        for (const key11 of notFlags){
            argv["--"].push(key11);
        }
    } else {
        for (const key12 of notFlags){
            argv._.push(key12);
        }
    }
    return argv;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2ZsYWdzL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vKipcbiAqIENvbW1hbmQgbGluZSBhcmd1bWVudHMgcGFyc2VyIGJhc2VkIG9uXG4gKiBbbWluaW1pc3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9taW5pbWlzdGpzL21pbmltaXN0KS5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2ZsYWdzL21vZC50c1wiO1xuICpcbiAqIGNvbnNvbGUuZGlyKHBhcnNlKERlbm8uYXJncykpO1xuICogYGBgXG4gKlxuICogYGBgc2hcbiAqICQgZGVubyBydW4gaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL2V4YW1wbGVzL2ZsYWdzLnRzIC1hIGJlZXAgLWIgYm9vcFxuICogeyBfOiBbXSwgYTogJ2JlZXAnLCBiOiAnYm9vcCcgfVxuICogYGBgXG4gKlxuICogYGBgc2hcbiAqICQgZGVubyBydW4gaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL2V4YW1wbGVzL2ZsYWdzLnRzIC14IDMgLXkgNCAtbjUgLWFiYyAtLWJlZXA9Ym9vcCBmb28gYmFyIGJhelxuICogeyBfOiBbICdmb28nLCAnYmFyJywgJ2JheicgXSxcbiAqICAgeDogMyxcbiAqICAgeTogNCxcbiAqICAgbjogNSxcbiAqICAgYTogdHJ1ZSxcbiAqICAgYjogdHJ1ZSxcbiAqICAgYzogdHJ1ZSxcbiAqICAgYmVlcDogJ2Jvb3AnIH1cbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uL191dGlsL2Fzc2VydHMudHNcIjtcblxuLyoqIENvbWJpbmVzIHJlY3Vyc2l2ZWx5IGFsbCBpbnRlcnNlY3Rpb24gdHlwZXMgYW5kIHJldHVybnMgYSBuZXcgc2luZ2xlIHR5cGUuICovXG50eXBlIElkPFRSZWNvcmQ+ID0gVFJlY29yZCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gID8gVFJlY29yZCBleHRlbmRzIGluZmVyIEluZmVycmVkUmVjb3JkXG4gICAgPyB7IFtLZXkgaW4ga2V5b2YgSW5mZXJyZWRSZWNvcmRdOiBJZDxJbmZlcnJlZFJlY29yZFtLZXldPiB9XG4gIDogbmV2ZXJcbiAgOiBUUmVjb3JkO1xuXG4vKiogQ29udmVydHMgYSB1bmlvbiB0eXBlIGBBIHwgQiB8IENgIGludG8gYW4gaW50ZXJzZWN0aW9uIHR5cGUgYEEgJiBCICYgQ2AuICovXG50eXBlIFVuaW9uVG9JbnRlcnNlY3Rpb248VFZhbHVlPiA9XG4gIChUVmFsdWUgZXh0ZW5kcyB1bmtub3duID8gKGFyZ3M6IFRWYWx1ZSkgPT4gdW5rbm93biA6IG5ldmVyKSBleHRlbmRzXG4gICAgKGFyZ3M6IGluZmVyIFIpID0+IHVua25vd24gPyBSIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPyBSIDogbmV2ZXJcbiAgICA6IG5ldmVyO1xuXG50eXBlIEJvb2xlYW5UeXBlID0gYm9vbGVhbiB8IHN0cmluZyB8IHVuZGVmaW5lZDtcbnR5cGUgU3RyaW5nVHlwZSA9IHN0cmluZyB8IHVuZGVmaW5lZDtcbnR5cGUgQXJnVHlwZSA9IFN0cmluZ1R5cGUgfCBCb29sZWFuVHlwZTtcblxudHlwZSBDb2xsZWN0YWJsZSA9IHN0cmluZyB8IHVuZGVmaW5lZDtcbnR5cGUgTmVnYXRhYmxlID0gc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG50eXBlIFVzZVR5cGVzPFxuICBUQm9vbGVhbnMgZXh0ZW5kcyBCb29sZWFuVHlwZSxcbiAgVFN0cmluZ3MgZXh0ZW5kcyBTdHJpbmdUeXBlLFxuICBUQ29sbGVjdGFibGUgZXh0ZW5kcyBDb2xsZWN0YWJsZSxcbj4gPSB1bmRlZmluZWQgZXh0ZW5kcyAoXG4gICYgKGZhbHNlIGV4dGVuZHMgVEJvb2xlYW5zID8gdW5kZWZpbmVkIDogVEJvb2xlYW5zKVxuICAmIFRDb2xsZWN0YWJsZVxuICAmIFRTdHJpbmdzXG4pID8gZmFsc2VcbiAgOiB0cnVlO1xuXG4vKipcbiAqIENyZWF0ZXMgYSByZWNvcmQgd2l0aCBhbGwgYXZhaWxhYmxlIGZsYWdzIHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgdHlwZSBhbmRcbiAqIGRlZmF1bHQgdHlwZS5cbiAqL1xudHlwZSBWYWx1ZXM8XG4gIFRCb29sZWFucyBleHRlbmRzIEJvb2xlYW5UeXBlLFxuICBUU3RyaW5ncyBleHRlbmRzIFN0cmluZ1R5cGUsXG4gIFRDb2xsZWN0YWJsZSBleHRlbmRzIENvbGxlY3RhYmxlLFxuICBUTmVnYXRhYmxlIGV4dGVuZHMgTmVnYXRhYmxlLFxuICBURGVmYXVsdCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkLFxuICBUQWxpYXNlcyBleHRlbmRzIEFsaWFzZXMgfCB1bmRlZmluZWQsXG4+ID0gVXNlVHlwZXM8VEJvb2xlYW5zLCBUU3RyaW5ncywgVENvbGxlY3RhYmxlPiBleHRlbmRzIHRydWUgPyBcbiAgICAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgJiBBZGRBbGlhc2VzPFxuICAgICAgU3ByZWFkRGVmYXVsdHM8XG4gICAgICAgICYgQ29sbGVjdFZhbHVlczxUU3RyaW5ncywgc3RyaW5nLCBUQ29sbGVjdGFibGUsIFROZWdhdGFibGU+XG4gICAgICAgICYgUmVjdXJzaXZlUmVxdWlyZWQ8Q29sbGVjdFZhbHVlczxUQm9vbGVhbnMsIGJvb2xlYW4sIFRDb2xsZWN0YWJsZT4+XG4gICAgICAgICYgQ29sbGVjdFVua25vd25WYWx1ZXM8XG4gICAgICAgICAgVEJvb2xlYW5zLFxuICAgICAgICAgIFRTdHJpbmdzLFxuICAgICAgICAgIFRDb2xsZWN0YWJsZSxcbiAgICAgICAgICBUTmVnYXRhYmxlXG4gICAgICAgID4sXG4gICAgICAgIERlZG90UmVjb3JkPFREZWZhdWx0PlxuICAgICAgPixcbiAgICAgIFRBbGlhc2VzXG4gICAgPlxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICA6IFJlY29yZDxzdHJpbmcsIGFueT47XG5cbnR5cGUgQWxpYXNlczxUQXJnTmFtZXMgPSBzdHJpbmcsIFRBbGlhc05hbWVzIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPiA9IFBhcnRpYWw8XG4gIFJlY29yZDxFeHRyYWN0PFRBcmdOYW1lcywgc3RyaW5nPiwgVEFsaWFzTmFtZXMgfCBSZWFkb25seUFycmF5PFRBbGlhc05hbWVzPj5cbj47XG5cbnR5cGUgQWRkQWxpYXNlczxcbiAgVEFyZ3MsXG4gIFRBbGlhc2VzIGV4dGVuZHMgQWxpYXNlcyB8IHVuZGVmaW5lZCxcbj4gPSB7XG4gIFtUQXJnTmFtZSBpbiBrZXlvZiBUQXJncyBhcyBBbGlhc05hbWVzPFRBcmdOYW1lLCBUQWxpYXNlcz5dOiBUQXJnc1tUQXJnTmFtZV07XG59O1xuXG50eXBlIEFsaWFzTmFtZXM8XG4gIFRBcmdOYW1lLFxuICBUQWxpYXNlcyBleHRlbmRzIEFsaWFzZXMgfCB1bmRlZmluZWQsXG4+ID0gVEFyZ05hbWUgZXh0ZW5kcyBrZXlvZiBUQWxpYXNlc1xuICA/IHN0cmluZyBleHRlbmRzIFRBbGlhc2VzW1RBcmdOYW1lXSA/IFRBcmdOYW1lXG4gIDogVEFsaWFzZXNbVEFyZ05hbWVdIGV4dGVuZHMgc3RyaW5nID8gVEFyZ05hbWUgfCBUQWxpYXNlc1tUQXJnTmFtZV1cbiAgOiBUQWxpYXNlc1tUQXJnTmFtZV0gZXh0ZW5kcyBBcnJheTxzdHJpbmc+XG4gICAgPyBUQXJnTmFtZSB8IFRBbGlhc2VzW1RBcmdOYW1lXVtudW1iZXJdXG4gIDogVEFyZ05hbWVcbiAgOiBUQXJnTmFtZTtcblxuLyoqXG4gKiBTcHJlYWRzIGFsbCBkZWZhdWx0IHZhbHVlcyBvZiBSZWNvcmQgYFREZWZhdWx0c2AgaW50byBSZWNvcmQgYFRBcmdzYFxuICogYW5kIG1ha2VzIGRlZmF1bHQgdmFsdWVzIHJlcXVpcmVkLlxuICpcbiAqICoqRXhhbXBsZToqKlxuICogYFNwcmVhZFZhbHVlczx7IGZvbz86IGJvb2xlYW4sIGJhcj86IG51bWJlciB9LCB7IGZvbzogbnVtYmVyIH0+YFxuICpcbiAqICoqUmVzdWx0OioqIGB7IGZvbzogYm9vbGVhbiB8IG51bWJlciwgYmFyPzogbnVtYmVyIH1gXG4gKi9cbnR5cGUgU3ByZWFkRGVmYXVsdHM8VEFyZ3MsIFREZWZhdWx0cz4gPSBURGVmYXVsdHMgZXh0ZW5kcyB1bmRlZmluZWQgPyBUQXJnc1xuICA6IFRBcmdzIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPyBcbiAgICAgICYgT21pdDxUQXJncywga2V5b2YgVERlZmF1bHRzPlxuICAgICAgJiB7XG4gICAgICAgIFtEZWZhdWx0IGluIGtleW9mIFREZWZhdWx0c106IERlZmF1bHQgZXh0ZW5kcyBrZXlvZiBUQXJnc1xuICAgICAgICAgID8gKFRBcmdzW0RlZmF1bHRdICYgVERlZmF1bHRzW0RlZmF1bHRdIHwgVERlZmF1bHRzW0RlZmF1bHRdKSBleHRlbmRzXG4gICAgICAgICAgICBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgICAgICAgICAgPyBOb25OdWxsYWJsZTxTcHJlYWREZWZhdWx0czxUQXJnc1tEZWZhdWx0XSwgVERlZmF1bHRzW0RlZmF1bHRdPj5cbiAgICAgICAgICA6IFREZWZhdWx0c1tEZWZhdWx0XSB8IE5vbk51bGxhYmxlPFRBcmdzW0RlZmF1bHRdPlxuICAgICAgICAgIDogdW5rbm93bjtcbiAgICAgIH1cbiAgOiBuZXZlcjtcblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBSZWNvcmQgZm9yIHRoZSBgZGVmYXVsdGAgb3B0aW9uIHRvIGFkZFxuICogYXV0by1zdWdnZXN0aW9uIHN1cHBvcnQgZm9yIElERSdzLlxuICovXG50eXBlIERlZmF1bHRzPFRCb29sZWFucyBleHRlbmRzIEJvb2xlYW5UeXBlLCBUU3RyaW5ncyBleHRlbmRzIFN0cmluZ1R5cGU+ID0gSWQ8XG4gIFVuaW9uVG9JbnRlcnNlY3Rpb248XG4gICAgJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIC8vIERlZG90dGVkIGF1dG8gc3VnZ2VzdGlvbnM6IHsgZm9vOiB7IGJhcjogdW5rbm93biB9IH1cbiAgICAmIE1hcFR5cGVzPFRTdHJpbmdzLCB1bmtub3duPlxuICAgICYgTWFwVHlwZXM8VEJvb2xlYW5zLCB1bmtub3duPlxuICAgIC8vIEZsYXQgYXV0byBzdWdnZXN0aW9uczogeyBcImZvby5iYXJcIjogdW5rbm93biB9XG4gICAgJiBNYXBEZWZhdWx0czxUQm9vbGVhbnM+XG4gICAgJiBNYXBEZWZhdWx0czxUU3RyaW5ncz5cbiAgPlxuPjtcblxudHlwZSBNYXBEZWZhdWx0czxUQXJnTmFtZXMgZXh0ZW5kcyBBcmdUeXBlPiA9IFBhcnRpYWw8XG4gIFJlY29yZDxUQXJnTmFtZXMgZXh0ZW5kcyBzdHJpbmcgPyBUQXJnTmFtZXMgOiBzdHJpbmcsIHVua25vd24+XG4+O1xuXG50eXBlIFJlY3Vyc2l2ZVJlcXVpcmVkPFRSZWNvcmQ+ID0gVFJlY29yZCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID8ge1xuICAgIFtLZXkgaW4ga2V5b2YgVFJlY29yZF0tPzogUmVjdXJzaXZlUmVxdWlyZWQ8VFJlY29yZFtLZXldPjtcbiAgfVxuICA6IFRSZWNvcmQ7XG5cbi8qKiBTYW1lIGFzIGBNYXBUeXBlc2AgYnV0IGFsc28gc3VwcG9ydHMgY29sbGVjdGFibGUgb3B0aW9ucy4gKi9cbnR5cGUgQ29sbGVjdFZhbHVlczxcbiAgVEFyZ05hbWVzIGV4dGVuZHMgQXJnVHlwZSxcbiAgVFR5cGUsXG4gIFRDb2xsZWN0YWJsZSBleHRlbmRzIENvbGxlY3RhYmxlLFxuICBUTmVnYXRhYmxlIGV4dGVuZHMgTmVnYXRhYmxlID0gdW5kZWZpbmVkLFxuPiA9IFVuaW9uVG9JbnRlcnNlY3Rpb248XG4gIEV4dHJhY3Q8VEFyZ05hbWVzLCBUQ29sbGVjdGFibGU+IGV4dGVuZHMgc3RyaW5nID8gXG4gICAgICAmIChFeGNsdWRlPFRBcmdOYW1lcywgVENvbGxlY3RhYmxlPiBleHRlbmRzIG5ldmVyID8gUmVjb3JkPG5ldmVyLCBuZXZlcj5cbiAgICAgICAgOiBNYXBUeXBlczxFeGNsdWRlPFRBcmdOYW1lcywgVENvbGxlY3RhYmxlPiwgVFR5cGUsIFROZWdhdGFibGU+KVxuICAgICAgJiAoRXh0cmFjdDxUQXJnTmFtZXMsIFRDb2xsZWN0YWJsZT4gZXh0ZW5kcyBuZXZlciA/IFJlY29yZDxuZXZlciwgbmV2ZXI+XG4gICAgICAgIDogUmVjdXJzaXZlUmVxdWlyZWQ8XG4gICAgICAgICAgTWFwVHlwZXM8RXh0cmFjdDxUQXJnTmFtZXMsIFRDb2xsZWN0YWJsZT4sIEFycmF5PFRUeXBlPiwgVE5lZ2F0YWJsZT5cbiAgICAgICAgPilcbiAgICA6IE1hcFR5cGVzPFRBcmdOYW1lcywgVFR5cGUsIFROZWdhdGFibGU+XG4+O1xuXG4vKiogU2FtZSBhcyBgUmVjb3JkYCBidXQgYWxzbyBzdXBwb3J0cyBkb3R0ZWQgYW5kIG5lZ2F0YWJsZSBvcHRpb25zLiAqL1xudHlwZSBNYXBUeXBlczxcbiAgVEFyZ05hbWVzIGV4dGVuZHMgQXJnVHlwZSxcbiAgVFR5cGUsXG4gIFROZWdhdGFibGUgZXh0ZW5kcyBOZWdhdGFibGUgPSB1bmRlZmluZWQsXG4+ID0gdW5kZWZpbmVkIGV4dGVuZHMgVEFyZ05hbWVzID8gUmVjb3JkPG5ldmVyLCBuZXZlcj5cbiAgOiBUQXJnTmFtZXMgZXh0ZW5kcyBgJHtpbmZlciBOYW1lfS4ke2luZmVyIFJlc3R9YCA/IHtcbiAgICAgIFtLZXkgaW4gTmFtZV0/OiBNYXBUeXBlczxcbiAgICAgICAgUmVzdCxcbiAgICAgICAgVFR5cGUsXG4gICAgICAgIFROZWdhdGFibGUgZXh0ZW5kcyBgJHtOYW1lfS4ke2luZmVyIE5lZ2F0ZX1gID8gTmVnYXRlIDogdW5kZWZpbmVkXG4gICAgICA+O1xuICAgIH1cbiAgOiBUQXJnTmFtZXMgZXh0ZW5kcyBzdHJpbmcgPyBQYXJ0aWFsPFxuICAgICAgUmVjb3JkPFRBcmdOYW1lcywgVE5lZ2F0YWJsZSBleHRlbmRzIFRBcmdOYW1lcyA/IFRUeXBlIHwgZmFsc2UgOiBUVHlwZT5cbiAgICA+XG4gIDogUmVjb3JkPG5ldmVyLCBuZXZlcj47XG5cbnR5cGUgQ29sbGVjdFVua25vd25WYWx1ZXM8XG4gIFRCb29sZWFucyBleHRlbmRzIEJvb2xlYW5UeXBlLFxuICBUU3RyaW5ncyBleHRlbmRzIFN0cmluZ1R5cGUsXG4gIFRDb2xsZWN0YWJsZSBleHRlbmRzIENvbGxlY3RhYmxlLFxuICBUTmVnYXRhYmxlIGV4dGVuZHMgTmVnYXRhYmxlLFxuPiA9IFVuaW9uVG9JbnRlcnNlY3Rpb248XG4gIFRDb2xsZWN0YWJsZSBleHRlbmRzIFRCb29sZWFucyAmIFRTdHJpbmdzID8gUmVjb3JkPG5ldmVyLCBuZXZlcj5cbiAgICA6IERlZG90UmVjb3JkPFxuICAgICAgLy8gVW5rbm93biBjb2xsZWN0YWJsZSAmIG5vbi1uZWdhdGFibGUgYXJncy5cbiAgICAgICYgUmVjb3JkPFxuICAgICAgICBFeGNsdWRlPFxuICAgICAgICAgIEV4dHJhY3Q8RXhjbHVkZTxUQ29sbGVjdGFibGUsIFROZWdhdGFibGU+LCBzdHJpbmc+LFxuICAgICAgICAgIEV4dHJhY3Q8VFN0cmluZ3MgfCBUQm9vbGVhbnMsIHN0cmluZz5cbiAgICAgICAgPixcbiAgICAgICAgQXJyYXk8dW5rbm93bj5cbiAgICAgID5cbiAgICAgIC8vIFVua25vd24gY29sbGVjdGFibGUgJiBuZWdhdGFibGUgYXJncy5cbiAgICAgICYgUmVjb3JkPFxuICAgICAgICBFeGNsdWRlPFxuICAgICAgICAgIEV4dHJhY3Q8RXh0cmFjdDxUQ29sbGVjdGFibGUsIFROZWdhdGFibGU+LCBzdHJpbmc+LFxuICAgICAgICAgIEV4dHJhY3Q8VFN0cmluZ3MgfCBUQm9vbGVhbnMsIHN0cmluZz5cbiAgICAgICAgPixcbiAgICAgICAgQXJyYXk8dW5rbm93bj4gfCBmYWxzZVxuICAgICAgPlxuICAgID5cbj47XG5cbi8qKiBDb252ZXJ0cyBgeyBcImZvby5iYXIuYmF6XCI6IHVua25vd24gfWAgaW50byBgeyBmb286IHsgYmFyOiB7IGJhejogdW5rbm93biB9IH0gfWAuICovXG50eXBlIERlZG90UmVjb3JkPFRSZWNvcmQ+ID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4gZXh0ZW5kcyBUUmVjb3JkID8gVFJlY29yZFxuICA6IFRSZWNvcmQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA/IFVuaW9uVG9JbnRlcnNlY3Rpb248XG4gICAgICBWYWx1ZU9mPFxuICAgICAgICB7XG4gICAgICAgICAgW0tleSBpbiBrZXlvZiBUUmVjb3JkXTogS2V5IGV4dGVuZHMgc3RyaW5nID8gRGVkb3Q8S2V5LCBUUmVjb3JkW0tleV0+XG4gICAgICAgICAgICA6IG5ldmVyO1xuICAgICAgICB9XG4gICAgICA+XG4gICAgPlxuICA6IFRSZWNvcmQ7XG5cbnR5cGUgRGVkb3Q8VEtleSBleHRlbmRzIHN0cmluZywgVFZhbHVlPiA9IFRLZXkgZXh0ZW5kc1xuICBgJHtpbmZlciBOYW1lfS4ke2luZmVyIFJlc3R9YCA/IHsgW0tleSBpbiBOYW1lXTogRGVkb3Q8UmVzdCwgVFZhbHVlPiB9XG4gIDogeyBbS2V5IGluIFRLZXldOiBUVmFsdWUgfTtcblxudHlwZSBWYWx1ZU9mPFRWYWx1ZT4gPSBUVmFsdWVba2V5b2YgVFZhbHVlXTtcblxuLyoqIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBwYXJzZWAuICovXG5leHBvcnQgdHlwZSBBcmdzPFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBUQXJncyBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55PixcbiAgVERvdWJsZURhc2ggZXh0ZW5kcyBib29sZWFuIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxuPiA9IElkPFxuICAmIFRBcmdzXG4gICYge1xuICAgIC8qKiBDb250YWlucyBhbGwgdGhlIGFyZ3VtZW50cyB0aGF0IGRpZG4ndCBoYXZlIGFuIG9wdGlvbiBhc3NvY2lhdGVkIHdpdGhcbiAgICAgKiB0aGVtLiAqL1xuICAgIF86IEFycmF5PHN0cmluZyB8IG51bWJlcj47XG4gIH1cbiAgJiAoYm9vbGVhbiBleHRlbmRzIFREb3VibGVEYXNoID8gRG91YmxlRGFzaFxuICAgIDogdHJ1ZSBleHRlbmRzIFREb3VibGVEYXNoID8gUmVxdWlyZWQ8RG91YmxlRGFzaD5cbiAgICA6IFJlY29yZDxuZXZlciwgbmV2ZXI+KVxuPjtcblxudHlwZSBEb3VibGVEYXNoID0ge1xuICAvKiogQ29udGFpbnMgYWxsIHRoZSBhcmd1bWVudHMgdGhhdCBhcHBlYXIgYWZ0ZXIgdGhlIGRvdWJsZSBkYXNoOiBcIi0tXCIuICovXG4gIFwiLS1cIj86IEFycmF5PHN0cmluZz47XG59O1xuXG4vKiogVGhlIG9wdGlvbnMgZm9yIHRoZSBgcGFyc2VgIGNhbGwuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9uczxcbiAgVEJvb2xlYW5zIGV4dGVuZHMgQm9vbGVhblR5cGUgPSBCb29sZWFuVHlwZSxcbiAgVFN0cmluZ3MgZXh0ZW5kcyBTdHJpbmdUeXBlID0gU3RyaW5nVHlwZSxcbiAgVENvbGxlY3RhYmxlIGV4dGVuZHMgQ29sbGVjdGFibGUgPSBDb2xsZWN0YWJsZSxcbiAgVE5lZ2F0YWJsZSBleHRlbmRzIE5lZ2F0YWJsZSA9IE5lZ2F0YWJsZSxcbiAgVERlZmF1bHQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCA9XG4gICAgfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIHwgdW5kZWZpbmVkLFxuICBUQWxpYXNlcyBleHRlbmRzIEFsaWFzZXMgfCB1bmRlZmluZWQgPSBBbGlhc2VzIHwgdW5kZWZpbmVkLFxuICBURG91YmxlRGFzaCBleHRlbmRzIGJvb2xlYW4gfCB1bmRlZmluZWQgPSBib29sZWFuIHwgdW5kZWZpbmVkLFxuPiB7XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCwgcG9wdWxhdGUgdGhlIHJlc3VsdCBgX2Agd2l0aCBldmVyeXRoaW5nIGJlZm9yZSB0aGUgYC0tYCBhbmRcbiAgICogdGhlIHJlc3VsdCBgWyctLSddYCB3aXRoIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGAtLWAuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICpcbiAgICogIEBleGFtcGxlXG4gICAqIGBgYHRzXG4gICAqIC8vICQgZGVubyBydW4gZXhhbXBsZS50cyAtLSBhIGFyZzFcbiAgICogaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9mbGFncy9tb2QudHNcIjtcbiAgICogY29uc29sZS5kaXIocGFyc2UoRGVuby5hcmdzLCB7IFwiLS1cIjogZmFsc2UgfSkpO1xuICAgKiAvLyBvdXRwdXQ6IHsgXzogWyBcImFcIiwgXCJhcmcxXCIgXSB9XG4gICAqIGNvbnNvbGUuZGlyKHBhcnNlKERlbm8uYXJncywgeyBcIi0tXCI6IHRydWUgfSkpO1xuICAgKiAvLyBvdXRwdXQ6IHsgXzogW10sIC0tOiBbIFwiYVwiLCBcImFyZzFcIiBdIH1cbiAgICogYGBgXG4gICAqL1xuICBcIi0tXCI/OiBURG91YmxlRGFzaDtcblxuICAvKipcbiAgICogQW4gb2JqZWN0IG1hcHBpbmcgc3RyaW5nIG5hbWVzIHRvIHN0cmluZ3Mgb3IgYXJyYXlzIG9mIHN0cmluZyBhcmd1bWVudFxuICAgKiBuYW1lcyB0byB1c2UgYXMgYWxpYXNlcy5cbiAgICovXG4gIGFsaWFzPzogVEFsaWFzZXM7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgc3RyaW5nIG9yIGFycmF5IG9mIHN0cmluZ3MgdG8gYWx3YXlzIHRyZWF0IGFzIGJvb2xlYW5zLiBJZlxuICAgKiBgdHJ1ZWAgd2lsbCB0cmVhdCBhbGwgZG91YmxlIGh5cGhlbmF0ZWQgYXJndW1lbnRzIHdpdGhvdXQgZXF1YWwgc2lnbnMgYXNcbiAgICogYGJvb2xlYW5gIChlLmcuIGFmZmVjdHMgYC0tZm9vYCwgbm90IGAtZmAgb3IgYC0tZm9vPWJhcmApLlxuICAgKiAgQWxsIGBib29sZWFuYCBhcmd1bWVudHMgd2lsbCBiZSBzZXQgdG8gYGZhbHNlYCBieSBkZWZhdWx0LlxuICAgKi9cbiAgYm9vbGVhbj86IFRCb29sZWFucyB8IFJlYWRvbmx5QXJyYXk8RXh0cmFjdDxUQm9vbGVhbnMsIHN0cmluZz4+O1xuXG4gIC8qKiBBbiBvYmplY3QgbWFwcGluZyBzdHJpbmcgYXJndW1lbnQgbmFtZXMgdG8gZGVmYXVsdCB2YWx1ZXMuICovXG4gIGRlZmF1bHQ/OiBURGVmYXVsdCAmIERlZmF1bHRzPFRCb29sZWFucywgVFN0cmluZ3M+O1xuXG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCwgcG9wdWxhdGUgdGhlIHJlc3VsdCBgX2Agd2l0aCBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdFxuICAgKiBub24tb3B0aW9uLlxuICAgKi9cbiAgc3RvcEVhcmx5PzogYm9vbGVhbjtcblxuICAvKiogQSBzdHJpbmcgb3IgYXJyYXkgb2Ygc3RyaW5ncyBhcmd1bWVudCBuYW1lcyB0byBhbHdheXMgdHJlYXQgYXMgc3RyaW5ncy4gKi9cbiAgc3RyaW5nPzogVFN0cmluZ3MgfCBSZWFkb25seUFycmF5PEV4dHJhY3Q8VFN0cmluZ3MsIHN0cmluZz4+O1xuXG4gIC8qKlxuICAgKiBBIHN0cmluZyBvciBhcnJheSBvZiBzdHJpbmdzIGFyZ3VtZW50IG5hbWVzIHRvIGFsd2F5cyB0cmVhdCBhcyBhcnJheXMuXG4gICAqIENvbGxlY3RhYmxlIG9wdGlvbnMgY2FuIGJlIHVzZWQgbXVsdGlwbGUgdGltZXMuIEFsbCB2YWx1ZXMgd2lsbCBiZVxuICAgKiBjb2xsZWN0ZWQgaW50byBvbmUgYXJyYXkuIElmIGEgbm9uLWNvbGxlY3RhYmxlIG9wdGlvbiBpcyB1c2VkIG11bHRpcGxlXG4gICAqIHRpbWVzLCB0aGUgbGFzdCB2YWx1ZSBpcyB1c2VkLlxuICAgKiBBbGwgQ29sbGVjdGFibGUgYXJndW1lbnRzIHdpbGwgYmUgc2V0IHRvIGBbXWAgYnkgZGVmYXVsdC5cbiAgICovXG4gIGNvbGxlY3Q/OiBUQ29sbGVjdGFibGUgfCBSZWFkb25seUFycmF5PEV4dHJhY3Q8VENvbGxlY3RhYmxlLCBzdHJpbmc+PjtcblxuICAvKipcbiAgICogQSBzdHJpbmcgb3IgYXJyYXkgb2Ygc3RyaW5ncyBhcmd1bWVudCBuYW1lcyB3aGljaCBjYW4gYmUgbmVnYXRlZFxuICAgKiBieSBwcmVmaXhpbmcgdGhlbSB3aXRoIGAtLW5vLWAsIGxpa2UgYC0tbm8tY29uZmlnYC5cbiAgICovXG4gIG5lZ2F0YWJsZT86IFROZWdhdGFibGUgfCBSZWFkb25seUFycmF5PEV4dHJhY3Q8VE5lZ2F0YWJsZSwgc3RyaW5nPj47XG5cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2hpY2ggaXMgaW52b2tlZCB3aXRoIGEgY29tbWFuZCBsaW5lIHBhcmFtZXRlciBub3QgZGVmaW5lZCBpblxuICAgKiB0aGUgYG9wdGlvbnNgIGNvbmZpZ3VyYXRpb24gb2JqZWN0LiBJZiB0aGUgZnVuY3Rpb24gcmV0dXJucyBgZmFsc2VgLCB0aGVcbiAgICogdW5rbm93biBvcHRpb24gaXMgbm90IGFkZGVkIHRvIGBwYXJzZWRBcmdzYC5cbiAgICovXG4gIHVua25vd24/OiAoYXJnOiBzdHJpbmcsIGtleT86IHN0cmluZywgdmFsdWU/OiB1bmtub3duKSA9PiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgRmxhZ3Mge1xuICBib29sczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj47XG4gIHN0cmluZ3M6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+O1xuICBjb2xsZWN0OiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcbiAgbmVnYXRhYmxlOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcbiAgdW5rbm93bkZuOiAoYXJnOiBzdHJpbmcsIGtleT86IHN0cmluZywgdmFsdWU/OiB1bmtub3duKSA9PiB1bmtub3duO1xuICBhbGxCb29sczogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIE5lc3RlZE1hcHBpbmcge1xuICBba2V5OiBzdHJpbmddOiBOZXN0ZWRNYXBwaW5nIHwgdW5rbm93bjtcbn1cblxuY29uc3QgeyBoYXNPd24gfSA9IE9iamVjdDtcblxuZnVuY3Rpb24gZ2V0PFRWYWx1ZT4oXG4gIG9iajogUmVjb3JkPHN0cmluZywgVFZhbHVlPixcbiAga2V5OiBzdHJpbmcsXG4pOiBUVmFsdWUgfCB1bmRlZmluZWQge1xuICBpZiAoaGFzT3duKG9iaiwga2V5KSkge1xuICAgIHJldHVybiBvYmpba2V5XTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGb3JjZTxUVmFsdWU+KG9iajogUmVjb3JkPHN0cmluZywgVFZhbHVlPiwga2V5OiBzdHJpbmcpOiBUVmFsdWUge1xuICBjb25zdCB2ID0gZ2V0KG9iaiwga2V5KTtcbiAgYXNzZXJ0KHYgIT0gbnVsbCk7XG4gIHJldHVybiB2O1xufVxuXG5mdW5jdGlvbiBpc051bWJlcih4OiB1bmtub3duKTogYm9vbGVhbiB7XG4gIGlmICh0eXBlb2YgeCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHRydWU7XG4gIGlmICgvXjB4WzAtOWEtZl0rJC9pLnRlc3QoU3RyaW5nKHgpKSkgcmV0dXJuIHRydWU7XG4gIHJldHVybiAvXlstK10/KD86XFxkKyg/OlxcLlxcZCopP3xcXC5cXGQrKShlWy0rXT9cXGQrKT8kLy50ZXN0KFN0cmluZyh4KSk7XG59XG5cbmZ1bmN0aW9uIGhhc0tleShvYmo6IE5lc3RlZE1hcHBpbmcsIGtleXM6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIGxldCBvID0gb2JqO1xuICBrZXlzLnNsaWNlKDAsIC0xKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICBvID0gKGdldChvLCBrZXkpID8/IHt9KSBhcyBOZXN0ZWRNYXBwaW5nO1xuICB9KTtcblxuICBjb25zdCBrZXkgPSBrZXlzW2tleXMubGVuZ3RoIC0gMV07XG4gIHJldHVybiBoYXNPd24obywga2V5KTtcbn1cblxuLyoqIFRha2UgYSBzZXQgb2YgY29tbWFuZCBsaW5lIGFyZ3VtZW50cywgb3B0aW9uYWxseSB3aXRoIGEgc2V0IG9mIG9wdGlvbnMsIGFuZFxuICogcmV0dXJuIGFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGZsYWdzIGZvdW5kIGluIHRoZSBwYXNzZWQgYXJndW1lbnRzLlxuICpcbiAqIEJ5IGRlZmF1bHQsIGFueSBhcmd1bWVudHMgc3RhcnRpbmcgd2l0aCBgLWAgb3IgYC0tYCBhcmUgY29uc2lkZXJlZCBib29sZWFuXG4gKiBmbGFncy4gSWYgdGhlIGFyZ3VtZW50IG5hbWUgaXMgZm9sbG93ZWQgYnkgYW4gZXF1YWwgc2lnbiAoYD1gKSBpdCBpc1xuICogY29uc2lkZXJlZCBhIGtleS12YWx1ZSBwYWlyLiBBbnkgYXJndW1lbnRzIHdoaWNoIGNvdWxkIG5vdCBiZSBwYXJzZWQgYXJlXG4gKiBhdmFpbGFibGUgaW4gdGhlIGBfYCBwcm9wZXJ0eSBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LlxuICpcbiAqIEJ5IGRlZmF1bHQsIHRoZSBmbGFncyBtb2R1bGUgdHJpZXMgdG8gZGV0ZXJtaW5lIHRoZSB0eXBlIG9mIGFsbCBhcmd1bWVudHNcbiAqIGF1dG9tYXRpY2FsbHkgYW5kIHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgYHBhcnNlYCBtZXRob2Qgd2lsbCBoYXZlIGFuIGluZGV4XG4gKiBzaWduYXR1cmUgd2l0aCBgYW55YCBhcyB2YWx1ZSAoYHsgW3g6IHN0cmluZ106IGFueSB9YCkuXG4gKlxuICogSWYgdGhlIGBzdHJpbmdgLCBgYm9vbGVhbmAgb3IgYGNvbGxlY3RgIG9wdGlvbiBpcyBzZXQsIHRoZSByZXR1cm4gdmFsdWUgb2ZcbiAqIHRoZSBgcGFyc2VgIG1ldGhvZCB3aWxsIGJlIGZ1bGx5IHR5cGVkIGFuZCB0aGUgaW5kZXggc2lnbmF0dXJlIG9mIHRoZSByZXR1cm5cbiAqIHR5cGUgd2lsbCBjaGFuZ2UgdG8gYHsgW3g6IHN0cmluZ106IHVua25vd24gfWAuXG4gKlxuICogQW55IGFyZ3VtZW50cyBhZnRlciBgJy0tJ2Agd2lsbCBub3QgYmUgcGFyc2VkIGFuZCB3aWxsIGVuZCB1cCBpbiBgcGFyc2VkQXJncy5fYC5cbiAqXG4gKiBOdW1lcmljLWxvb2tpbmcgYXJndW1lbnRzIHdpbGwgYmUgcmV0dXJuZWQgYXMgbnVtYmVycyB1bmxlc3MgYG9wdGlvbnMuc3RyaW5nYFxuICogb3IgYG9wdGlvbnMuYm9vbGVhbmAgaXMgc2V0IGZvciB0aGF0IGFyZ3VtZW50IG5hbWUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2ZsYWdzL21vZC50c1wiO1xuICogY29uc3QgcGFyc2VkQXJncyA9IHBhcnNlKERlbm8uYXJncyk7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vZmxhZ3MvbW9kLnRzXCI7XG4gKiBjb25zdCBwYXJzZWRBcmdzID0gcGFyc2UoW1wiLS1mb29cIiwgXCItLWJhcj1iYXpcIiwgXCIuL3F1dXgudHh0XCJdKTtcbiAqIC8vIHBhcnNlZEFyZ3M6IHsgZm9vOiB0cnVlLCBiYXI6IFwiYmF6XCIsIF86IFtcIi4vcXV1eC50eHRcIl0gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZTxcbiAgVEFyZ3MgZXh0ZW5kcyBWYWx1ZXM8XG4gICAgVEJvb2xlYW5zLFxuICAgIFRTdHJpbmdzLFxuICAgIFRDb2xsZWN0YWJsZSxcbiAgICBUTmVnYXRhYmxlLFxuICAgIFREZWZhdWx0cyxcbiAgICBUQWxpYXNlc1xuICA+LFxuICBURG91YmxlRGFzaCBleHRlbmRzIGJvb2xlYW4gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQsXG4gIFRCb29sZWFucyBleHRlbmRzIEJvb2xlYW5UeXBlID0gdW5kZWZpbmVkLFxuICBUU3RyaW5ncyBleHRlbmRzIFN0cmluZ1R5cGUgPSB1bmRlZmluZWQsXG4gIFRDb2xsZWN0YWJsZSBleHRlbmRzIENvbGxlY3RhYmxlID0gdW5kZWZpbmVkLFxuICBUTmVnYXRhYmxlIGV4dGVuZHMgTmVnYXRhYmxlID0gdW5kZWZpbmVkLFxuICBURGVmYXVsdHMgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgVEFsaWFzZXMgZXh0ZW5kcyBBbGlhc2VzPFRBbGlhc0FyZ05hbWVzLCBUQWxpYXNOYW1lcz4gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQsXG4gIFRBbGlhc0FyZ05hbWVzIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLFxuICBUQWxpYXNOYW1lcyBleHRlbmRzIHN0cmluZyA9IHN0cmluZyxcbj4oXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICB7XG4gICAgXCItLVwiOiBkb3VibGVEYXNoID0gZmFsc2UsXG4gICAgYWxpYXMgPSB7fSBhcyBOb25OdWxsYWJsZTxUQWxpYXNlcz4sXG4gICAgYm9vbGVhbiA9IGZhbHNlLFxuICAgIGRlZmF1bHQ6IGRlZmF1bHRzID0ge30gYXMgVERlZmF1bHRzICYgRGVmYXVsdHM8VEJvb2xlYW5zLCBUU3RyaW5ncz4sXG4gICAgc3RvcEVhcmx5ID0gZmFsc2UsXG4gICAgc3RyaW5nID0gW10sXG4gICAgY29sbGVjdCA9IFtdLFxuICAgIG5lZ2F0YWJsZSA9IFtdLFxuICAgIHVua25vd24gPSAoaTogc3RyaW5nKTogdW5rbm93biA9PiBpLFxuICB9OiBQYXJzZU9wdGlvbnM8XG4gICAgVEJvb2xlYW5zLFxuICAgIFRTdHJpbmdzLFxuICAgIFRDb2xsZWN0YWJsZSxcbiAgICBUTmVnYXRhYmxlLFxuICAgIFREZWZhdWx0cyxcbiAgICBUQWxpYXNlcyxcbiAgICBURG91YmxlRGFzaFxuICA+ID0ge30sXG4pOiBBcmdzPFRBcmdzLCBURG91YmxlRGFzaD4ge1xuICBjb25zdCBhbGlhc2VzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7fTtcbiAgY29uc3QgZmxhZ3M6IEZsYWdzID0ge1xuICAgIGJvb2xzOiB7fSxcbiAgICBzdHJpbmdzOiB7fSxcbiAgICB1bmtub3duRm46IHVua25vd24sXG4gICAgYWxsQm9vbHM6IGZhbHNlLFxuICAgIGNvbGxlY3Q6IHt9LFxuICAgIG5lZ2F0YWJsZToge30sXG4gIH07XG5cbiAgaWYgKGFsaWFzICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbGlhcykge1xuICAgICAgY29uc3QgdmFsID0gZ2V0Rm9yY2UoYWxpYXMsIGtleSk7XG4gICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBhbGlhc2VzW2tleV0gPSBbdmFsXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFsaWFzZXNba2V5XSA9IHZhbCBhcyBBcnJheTxzdHJpbmc+O1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBhbGlhcyBvZiBnZXRGb3JjZShhbGlhc2VzLCBrZXkpKSB7XG4gICAgICAgIGFsaWFzZXNbYWxpYXNdID0gW2tleV0uY29uY2F0KGFsaWFzZXNba2V5XS5maWx0ZXIoKHkpID0+IGFsaWFzICE9PSB5KSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGJvb2xlYW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgYm9vbGVhbiA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgIGZsYWdzLmFsbEJvb2xzID0gISFib29sZWFuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBib29sZWFuQXJnczogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gdHlwZW9mIGJvb2xlYW4gPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBbYm9vbGVhbl1cbiAgICAgICAgOiBib29sZWFuO1xuXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBib29sZWFuQXJncy5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgICAgZmxhZ3MuYm9vbHNba2V5XSA9IHRydWU7XG4gICAgICAgIGNvbnN0IGFsaWFzID0gZ2V0KGFsaWFzZXMsIGtleSk7XG4gICAgICAgIGlmIChhbGlhcykge1xuICAgICAgICAgIGZvciAoY29uc3QgYWwgb2YgYWxpYXMpIHtcbiAgICAgICAgICAgIGZsYWdzLmJvb2xzW2FsXSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0cmluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgc3RyaW5nQXJnczogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gdHlwZW9mIHN0cmluZyA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBbc3RyaW5nXVxuICAgICAgOiBzdHJpbmc7XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBzdHJpbmdBcmdzLmZpbHRlcihCb29sZWFuKSkge1xuICAgICAgZmxhZ3Muc3RyaW5nc1trZXldID0gdHJ1ZTtcbiAgICAgIGNvbnN0IGFsaWFzID0gZ2V0KGFsaWFzZXMsIGtleSk7XG4gICAgICBpZiAoYWxpYXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBhbCBvZiBhbGlhcykge1xuICAgICAgICAgIGZsYWdzLnN0cmluZ3NbYWxdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChjb2xsZWN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBjb2xsZWN0QXJnczogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gdHlwZW9mIGNvbGxlY3QgPT09IFwic3RyaW5nXCJcbiAgICAgID8gW2NvbGxlY3RdXG4gICAgICA6IGNvbGxlY3Q7XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBjb2xsZWN0QXJncy5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgIGZsYWdzLmNvbGxlY3Rba2V5XSA9IHRydWU7XG4gICAgICBjb25zdCBhbGlhcyA9IGdldChhbGlhc2VzLCBrZXkpO1xuICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgIGZvciAoY29uc3QgYWwgb2YgYWxpYXMpIHtcbiAgICAgICAgICBmbGFncy5jb2xsZWN0W2FsXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAobmVnYXRhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBuZWdhdGFibGVBcmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4gPSB0eXBlb2YgbmVnYXRhYmxlID09PSBcInN0cmluZ1wiXG4gICAgICA/IFtuZWdhdGFibGVdXG4gICAgICA6IG5lZ2F0YWJsZTtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIG5lZ2F0YWJsZUFyZ3MuZmlsdGVyKEJvb2xlYW4pKSB7XG4gICAgICBmbGFncy5uZWdhdGFibGVba2V5XSA9IHRydWU7XG4gICAgICBjb25zdCBhbGlhcyA9IGdldChhbGlhc2VzLCBrZXkpO1xuICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgIGZvciAoY29uc3QgYWwgb2YgYWxpYXMpIHtcbiAgICAgICAgICBmbGFncy5uZWdhdGFibGVbYWxdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGFyZ3Y6IEFyZ3MgPSB7IF86IFtdIH07XG5cbiAgZnVuY3Rpb24gYXJnRGVmaW5lZChrZXk6IHN0cmluZywgYXJnOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgKGZsYWdzLmFsbEJvb2xzICYmIC9eLS1bXj1dKyQvLnRlc3QoYXJnKSkgfHxcbiAgICAgIGdldChmbGFncy5ib29scywga2V5KSB8fFxuICAgICAgISFnZXQoZmxhZ3Muc3RyaW5ncywga2V5KSB8fFxuICAgICAgISFnZXQoYWxpYXNlcywga2V5KVxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRLZXkoXG4gICAgb2JqOiBOZXN0ZWRNYXBwaW5nLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICB2YWx1ZTogdW5rbm93bixcbiAgICBjb2xsZWN0ID0gdHJ1ZSxcbiAgKSB7XG4gICAgbGV0IG8gPSBvYmo7XG4gICAgY29uc3Qga2V5cyA9IG5hbWUuc3BsaXQoXCIuXCIpO1xuICAgIGtleXMuc2xpY2UoMCwgLTEpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgaWYgKGdldChvLCBrZXkpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb1trZXldID0ge307XG4gICAgICB9XG4gICAgICBvID0gZ2V0KG8sIGtleSkgYXMgTmVzdGVkTWFwcGluZztcbiAgICB9KTtcblxuICAgIGNvbnN0IGtleSA9IGtleXNba2V5cy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBjb2xsZWN0YWJsZSA9IGNvbGxlY3QgJiYgISFnZXQoZmxhZ3MuY29sbGVjdCwgbmFtZSk7XG5cbiAgICBpZiAoIWNvbGxlY3RhYmxlKSB7XG4gICAgICBvW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKGdldChvLCBrZXkpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG9ba2V5XSA9IFt2YWx1ZV07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGdldChvLCBrZXkpKSkge1xuICAgICAgKG9ba2V5XSBhcyB1bmtub3duW10pLnB1c2godmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvW2tleV0gPSBbZ2V0KG8sIGtleSksIHZhbHVlXTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXRBcmcoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsOiB1bmtub3duLFxuICAgIGFyZzogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxuICAgIGNvbGxlY3Q/OiBib29sZWFuLFxuICApIHtcbiAgICBpZiAoYXJnICYmIGZsYWdzLnVua25vd25GbiAmJiAhYXJnRGVmaW5lZChrZXksIGFyZykpIHtcbiAgICAgIGlmIChmbGFncy51bmtub3duRm4oYXJnLCBrZXksIHZhbCkgPT09IGZhbHNlKSByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSAhZ2V0KGZsYWdzLnN0cmluZ3MsIGtleSkgJiYgaXNOdW1iZXIodmFsKSA/IE51bWJlcih2YWwpIDogdmFsO1xuICAgIHNldEtleShhcmd2LCBrZXksIHZhbHVlLCBjb2xsZWN0KTtcblxuICAgIGNvbnN0IGFsaWFzID0gZ2V0KGFsaWFzZXMsIGtleSk7XG4gICAgaWYgKGFsaWFzKSB7XG4gICAgICBmb3IgKGNvbnN0IHggb2YgYWxpYXMpIHtcbiAgICAgICAgc2V0S2V5KGFyZ3YsIHgsIHZhbHVlLCBjb2xsZWN0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBhbGlhc0lzQm9vbGVhbihrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBnZXRGb3JjZShhbGlhc2VzLCBrZXkpLnNvbWUoXG4gICAgICAoeCkgPT4gdHlwZW9mIGdldChmbGFncy5ib29scywgeCkgPT09IFwiYm9vbGVhblwiLFxuICAgICk7XG4gIH1cblxuICBsZXQgbm90RmxhZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gYWxsIGFyZ3MgYWZ0ZXIgXCItLVwiIGFyZSBub3QgcGFyc2VkXG4gIGlmIChhcmdzLmluY2x1ZGVzKFwiLS1cIikpIHtcbiAgICBub3RGbGFncyA9IGFyZ3Muc2xpY2UoYXJncy5pbmRleE9mKFwiLS1cIikgKyAxKTtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCBhcmdzLmluZGV4T2YoXCItLVwiKSk7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhcmcgPSBhcmdzW2ldO1xuXG4gICAgaWYgKC9eLS0uKz0vLnRlc3QoYXJnKSkge1xuICAgICAgY29uc3QgbSA9IGFyZy5tYXRjaCgvXi0tKFtePV0rKT0oLiopJC9zKTtcbiAgICAgIGFzc2VydChtICE9IG51bGwpO1xuICAgICAgY29uc3QgWywga2V5LCB2YWx1ZV0gPSBtO1xuXG4gICAgICBpZiAoZmxhZ3MuYm9vbHNba2V5XSkge1xuICAgICAgICBjb25zdCBib29sZWFuVmFsdWUgPSB2YWx1ZSAhPT0gXCJmYWxzZVwiO1xuICAgICAgICBzZXRBcmcoa2V5LCBib29sZWFuVmFsdWUsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRBcmcoa2V5LCB2YWx1ZSwgYXJnKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgL14tLW5vLS4rLy50ZXN0KGFyZykgJiYgZ2V0KGZsYWdzLm5lZ2F0YWJsZSwgYXJnLnJlcGxhY2UoL14tLW5vLS8sIFwiXCIpKVxuICAgICkge1xuICAgICAgY29uc3QgbSA9IGFyZy5tYXRjaCgvXi0tbm8tKC4rKS8pO1xuICAgICAgYXNzZXJ0KG0gIT0gbnVsbCk7XG4gICAgICBzZXRBcmcobVsxXSwgZmFsc2UsIGFyZywgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAoL14tLS4rLy50ZXN0KGFyZykpIHtcbiAgICAgIGNvbnN0IG0gPSBhcmcubWF0Y2goL14tLSguKykvKTtcbiAgICAgIGFzc2VydChtICE9IG51bGwpO1xuICAgICAgY29uc3QgWywga2V5XSA9IG07XG4gICAgICBjb25zdCBuZXh0ID0gYXJnc1tpICsgMV07XG4gICAgICBpZiAoXG4gICAgICAgIG5leHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAhL14tLy50ZXN0KG5leHQpICYmXG4gICAgICAgICFnZXQoZmxhZ3MuYm9vbHMsIGtleSkgJiZcbiAgICAgICAgIWZsYWdzLmFsbEJvb2xzICYmXG4gICAgICAgIChnZXQoYWxpYXNlcywga2V5KSA/ICFhbGlhc0lzQm9vbGVhbihrZXkpIDogdHJ1ZSlcbiAgICAgICkge1xuICAgICAgICBzZXRBcmcoa2V5LCBuZXh0LCBhcmcpO1xuICAgICAgICBpKys7XG4gICAgICB9IGVsc2UgaWYgKC9eKHRydWV8ZmFsc2UpJC8udGVzdChuZXh0KSkge1xuICAgICAgICBzZXRBcmcoa2V5LCBuZXh0ID09PSBcInRydWVcIiwgYXJnKTtcbiAgICAgICAgaSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0QXJnKGtleSwgZ2V0KGZsYWdzLnN0cmluZ3MsIGtleSkgPyBcIlwiIDogdHJ1ZSwgYXJnKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKC9eLVteLV0rLy50ZXN0KGFyZykpIHtcbiAgICAgIGNvbnN0IGxldHRlcnMgPSBhcmcuc2xpY2UoMSwgLTEpLnNwbGl0KFwiXCIpO1xuXG4gICAgICBsZXQgYnJva2VuID0gZmFsc2U7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGxldHRlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IGFyZy5zbGljZShqICsgMik7XG5cbiAgICAgICAgaWYgKG5leHQgPT09IFwiLVwiKSB7XG4gICAgICAgICAgc2V0QXJnKGxldHRlcnNbal0sIG5leHQsIGFyZyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoL1tBLVphLXpdLy50ZXN0KGxldHRlcnNbal0pICYmIC89Ly50ZXN0KG5leHQpKSB7XG4gICAgICAgICAgc2V0QXJnKGxldHRlcnNbal0sIG5leHQuc3BsaXQoLz0oLispLylbMV0sIGFyZyk7XG4gICAgICAgICAgYnJva2VuID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAvW0EtWmEtel0vLnRlc3QobGV0dGVyc1tqXSkgJiZcbiAgICAgICAgICAvLT9cXGQrKFxcLlxcZCopPyhlLT9cXGQrKT8kLy50ZXN0KG5leHQpXG4gICAgICAgICkge1xuICAgICAgICAgIHNldEFyZyhsZXR0ZXJzW2pdLCBuZXh0LCBhcmcpO1xuICAgICAgICAgIGJyb2tlbiA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGV0dGVyc1tqICsgMV0gJiYgbGV0dGVyc1tqICsgMV0ubWF0Y2goL1xcVy8pKSB7XG4gICAgICAgICAgc2V0QXJnKGxldHRlcnNbal0sIGFyZy5zbGljZShqICsgMiksIGFyZyk7XG4gICAgICAgICAgYnJva2VuID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRBcmcobGV0dGVyc1tqXSwgZ2V0KGZsYWdzLnN0cmluZ3MsIGxldHRlcnNbal0pID8gXCJcIiA6IHRydWUsIGFyZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgW2tleV0gPSBhcmcuc2xpY2UoLTEpO1xuICAgICAgaWYgKCFicm9rZW4gJiYga2V5ICE9PSBcIi1cIikge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgYXJnc1tpICsgMV0gJiZcbiAgICAgICAgICAhL14oLXwtLSlbXi1dLy50ZXN0KGFyZ3NbaSArIDFdKSAmJlxuICAgICAgICAgICFnZXQoZmxhZ3MuYm9vbHMsIGtleSkgJiZcbiAgICAgICAgICAoZ2V0KGFsaWFzZXMsIGtleSkgPyAhYWxpYXNJc0Jvb2xlYW4oa2V5KSA6IHRydWUpXG4gICAgICAgICkge1xuICAgICAgICAgIHNldEFyZyhrZXksIGFyZ3NbaSArIDFdLCBhcmcpO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfSBlbHNlIGlmIChhcmdzW2kgKyAxXSAmJiAvXih0cnVlfGZhbHNlKSQvLnRlc3QoYXJnc1tpICsgMV0pKSB7XG4gICAgICAgICAgc2V0QXJnKGtleSwgYXJnc1tpICsgMV0gPT09IFwidHJ1ZVwiLCBhcmcpO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRBcmcoa2V5LCBnZXQoZmxhZ3Muc3RyaW5ncywga2V5KSA/IFwiXCIgOiB0cnVlLCBhcmcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghZmxhZ3MudW5rbm93bkZuIHx8IGZsYWdzLnVua25vd25GbihhcmcpICE9PSBmYWxzZSkge1xuICAgICAgICBhcmd2Ll8ucHVzaChmbGFncy5zdHJpbmdzW1wiX1wiXSA/PyAhaXNOdW1iZXIoYXJnKSA/IGFyZyA6IE51bWJlcihhcmcpKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdG9wRWFybHkpIHtcbiAgICAgICAgYXJndi5fLnB1c2goLi4uYXJncy5zbGljZShpICsgMSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhkZWZhdWx0cykpIHtcbiAgICBpZiAoIWhhc0tleShhcmd2LCBrZXkuc3BsaXQoXCIuXCIpKSkge1xuICAgICAgc2V0S2V5KGFyZ3YsIGtleSwgdmFsdWUpO1xuXG4gICAgICBpZiAoYWxpYXNlc1trZXldKSB7XG4gICAgICAgIGZvciAoY29uc3QgeCBvZiBhbGlhc2VzW2tleV0pIHtcbiAgICAgICAgICBzZXRLZXkoYXJndiwgeCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZmxhZ3MuYm9vbHMpKSB7XG4gICAgaWYgKCFoYXNLZXkoYXJndiwga2V5LnNwbGl0KFwiLlwiKSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZ2V0KGZsYWdzLmNvbGxlY3QsIGtleSkgPyBbXSA6IGZhbHNlO1xuICAgICAgc2V0S2V5KFxuICAgICAgICBhcmd2LFxuICAgICAgICBrZXksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBmYWxzZSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZmxhZ3Muc3RyaW5ncykpIHtcbiAgICBpZiAoIWhhc0tleShhcmd2LCBrZXkuc3BsaXQoXCIuXCIpKSAmJiBnZXQoZmxhZ3MuY29sbGVjdCwga2V5KSkge1xuICAgICAgc2V0S2V5KFxuICAgICAgICBhcmd2LFxuICAgICAgICBrZXksXG4gICAgICAgIFtdLFxuICAgICAgICBmYWxzZSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRvdWJsZURhc2gpIHtcbiAgICBhcmd2W1wiLS1cIl0gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBub3RGbGFncykge1xuICAgICAgYXJndltcIi0tXCJdLnB1c2goa2V5KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2Ygbm90RmxhZ3MpIHtcbiAgICAgIGFyZ3YuXy5wdXNoKGtleSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFyZ3YgYXMgQXJnczxUQXJncywgVERvdWJsZURhc2g+O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0ErQkMsR0FDRCxTQUFTLE1BQU0sUUFBUSxxQkFBcUIsQ0FBQztBQXNVN0MsTUFBTSxFQUFFLE1BQU0sQ0FBQSxFQUFFLEdBQUcsTUFBTSxBQUFDO0FBRTFCLFNBQVMsR0FBRyxDQUNWLEdBQTJCLEVBQzNCLEdBQVcsRUFDUztJQUNwQixJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDcEIsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEIsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBUyxHQUEyQixFQUFFLEdBQVcsRUFBVTtJQUMxRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxBQUFDO0lBQ3hCLE1BQU0sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsQ0FBVSxFQUFXO0lBQ3JDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxFQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3ZDLElBQUksaUJBQWlCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQztJQUNsRCxPQUFPLDZDQUE2QyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLEdBQWtCLEVBQUUsSUFBYyxFQUFXO0lBQzNELElBQUksQ0FBQyxHQUFHLEdBQUcsQUFBQztJQUNaLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxHQUFLO1FBQ2pDLENBQUMsR0FBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQUFBa0IsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDO0lBQ2xDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWlDQyxHQUNELE9BQU8sU0FBUyxLQUFLLENBbUJuQixJQUFjLEVBQ2QsRUFDRSxJQUFJLEVBQUUsVUFBVSxHQUFHLEtBQUssQ0FBQSxFQUN4QixLQUFLLEVBQUcsRUFBRSxDQUF5QixFQUNuQyxPQUFPLEVBQUcsS0FBSyxDQUFBLEVBQ2YsT0FBTyxFQUFFLFFBQVEsR0FBRyxFQUFFLEFBQTZDLENBQUEsRUFDbkUsU0FBUyxFQUFHLEtBQUssQ0FBQSxFQUNqQixNQUFNLEVBQUcsRUFBRSxDQUFBLEVBQ1gsT0FBTyxFQUFHLEVBQUUsQ0FBQSxFQUNaLFNBQVMsRUFBRyxFQUFFLENBQUEsRUFDZCxPQUFPLEVBQUcsQ0FBQyxDQUFTLEdBQWMsQ0FBQyxDQUFBLEVBU3BDLEdBQUcsRUFBRSxFQUNvQjtJQUMxQixNQUFNLE9BQU8sR0FBNkIsRUFBRSxBQUFDO0lBQzdDLE1BQU0sS0FBSyxHQUFVO1FBQ25CLEtBQUssRUFBRSxFQUFFO1FBQ1QsT0FBTyxFQUFFLEVBQUU7UUFDWCxTQUFTLEVBQUUsT0FBTztRQUNsQixRQUFRLEVBQUUsS0FBSztRQUNmLE9BQU8sRUFBRSxFQUFFO1FBQ1gsU0FBUyxFQUFFLEVBQUU7S0FDZCxBQUFDO0lBRUYsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO1FBQ3ZCLElBQUssTUFBTSxHQUFHLElBQUksS0FBSyxDQUFFO1lBQ3ZCLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEFBQUM7WUFDakMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7Z0JBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRztvQkFBQyxHQUFHO2lCQUFDLENBQUM7WUFDdkIsT0FBTztnQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxBQUFpQixDQUFDO1lBQ3RDLENBQUM7WUFDRCxLQUFLLE1BQU0sTUFBSyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUU7Z0JBQzFDLE9BQU8sQ0FBQyxNQUFLLENBQUMsR0FBRztvQkFBQyxHQUFHO2lCQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUssTUFBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekUsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFO1FBQ3pCLElBQUksT0FBTyxPQUFPLEtBQUssU0FBUyxFQUFFO1lBQ2hDLEtBQUssQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM3QixPQUFPO1lBQ0wsTUFBTSxXQUFXLEdBQTBCLE9BQU8sT0FBTyxLQUFLLFFBQVEsR0FDbEU7Z0JBQUMsT0FBTzthQUFDLEdBQ1QsT0FBTyxBQUFDO1lBRVosS0FBSyxNQUFNLElBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFFO2dCQUM3QyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDeEIsTUFBTSxNQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsQUFBQztnQkFDaEMsSUFBSSxNQUFLLEVBQUU7b0JBQ1QsS0FBSyxNQUFNLEVBQUUsSUFBSSxNQUFLLENBQUU7d0JBQ3RCLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUN6QixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDeEIsTUFBTSxVQUFVLEdBQTBCLE9BQU8sTUFBTSxLQUFLLFFBQVEsR0FDaEU7WUFBQyxNQUFNO1NBQUMsR0FDUixNQUFNLEFBQUM7UUFFWCxLQUFLLE1BQU0sSUFBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUU7WUFDNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDMUIsTUFBTSxNQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsQUFBQztZQUNoQyxJQUFJLE1BQUssRUFBRTtnQkFDVCxLQUFLLE1BQU0sR0FBRSxJQUFJLE1BQUssQ0FBRTtvQkFDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzNCLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7UUFDekIsTUFBTSxXQUFXLEdBQTBCLE9BQU8sT0FBTyxLQUFLLFFBQVEsR0FDbEU7WUFBQyxPQUFPO1NBQUMsR0FDVCxPQUFPLEFBQUM7UUFFWixLQUFLLE1BQU0sSUFBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUU7WUFDN0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDMUIsTUFBTSxNQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsQUFBQztZQUNoQyxJQUFJLE1BQUssRUFBRTtnQkFDVCxLQUFLLE1BQU0sR0FBRSxJQUFJLE1BQUssQ0FBRTtvQkFDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzNCLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7UUFDM0IsTUFBTSxhQUFhLEdBQTBCLE9BQU8sU0FBUyxLQUFLLFFBQVEsR0FDdEU7WUFBQyxTQUFTO1NBQUMsR0FDWCxTQUFTLEFBQUM7UUFFZCxLQUFLLE1BQU0sSUFBRyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUU7WUFDL0MsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDNUIsTUFBTSxNQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsQUFBQztZQUNoQyxJQUFJLE1BQUssRUFBRTtnQkFDVCxLQUFLLE1BQU0sR0FBRSxJQUFJLE1BQUssQ0FBRTtvQkFDdEIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzdCLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLElBQUksR0FBUztRQUFFLENBQUMsRUFBRSxFQUFFO0tBQUUsQUFBQztJQUU3QixTQUFTLFVBQVUsQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFXO1FBQ3JELE9BQ0UsQUFBQyxLQUFLLENBQUMsUUFBUSxJQUFJLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUN4QyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFDckIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUN6QixDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FDbkI7SUFDSixDQUFDO0lBRUQsU0FBUyxNQUFNLENBQ2IsR0FBa0IsRUFDbEIsSUFBWSxFQUNaLEtBQWMsRUFDZCxPQUFPLEdBQUcsSUFBSSxFQUNkO1FBQ0EsSUFBSSxDQUFDLEdBQUcsR0FBRyxBQUFDO1FBQ1osTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQUFBQztRQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFVLEdBQUcsRUFBRTtZQUN2QyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFO2dCQUM3QixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2QsQ0FBQztZQUNELENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxBQUFpQixDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEFBQUM7UUFDbEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQUFBQztRQUUxRCxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDakIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFO1lBQ3BDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRztnQkFBQyxLQUFLO2FBQUMsQ0FBQztRQUNuQixPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDcEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFlLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxPQUFPO1lBQ0wsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHO2dCQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO2dCQUFFLEtBQUs7YUFBQyxDQUFDO1FBQ2hDLENBQUM7SUFDSCxDQUFDO0lBRUQsU0FBUyxNQUFNLENBQ2IsR0FBVyxFQUNYLEdBQVksRUFDWixHQUF1QixHQUFHLFNBQVMsRUFDbkMsT0FBaUIsRUFDakI7UUFDQSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNuRCxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxLQUFLLEVBQUUsT0FBTztRQUN2RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQUFBQztRQUM1RSxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQUFBQztRQUNoQyxJQUFJLEtBQUssRUFBRTtZQUNULEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxDQUFFO2dCQUNyQixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEMsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsR0FBVyxFQUFXO1FBQzVDLE9BQU8sUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQ2hDLENBQUMsQ0FBQyxHQUFLLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUNoRCxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksUUFBUSxHQUFhLEVBQUUsQUFBQztJQUU1QixxQ0FBcUM7SUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3ZCLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsSUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUU7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxBQUFDO1FBRXBCLElBQUksU0FBUyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUsscUJBQXFCLEFBQUM7WUFDekMsTUFBTSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztZQUNsQixNQUFNLEdBQUcsSUFBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQUFBQztZQUV6QixJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLEVBQUU7Z0JBQ3BCLE1BQU0sWUFBWSxHQUFHLEtBQUssS0FBSyxPQUFPLEFBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxJQUFHLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pDLE9BQU87Z0JBQ0wsTUFBTSxDQUFDLElBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNILE9BQU8sSUFDTCxXQUFXLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsT0FBTyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQ3ZFO1lBQ0EsTUFBTSxFQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssY0FBYyxBQUFDO1lBQ2xDLE1BQU0sQ0FBQyxFQUFDLElBQUksSUFBSSxDQUFDLENBQUM7WUFDbEIsTUFBTSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1QixNQUFNLEVBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxXQUFXLEFBQUM7WUFDL0IsTUFBTSxDQUFDLEVBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztZQUNsQixNQUFNLEdBQUcsSUFBRyxDQUFDLEdBQUcsRUFBQyxBQUFDO1lBQ2xCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUM7WUFDekIsSUFDRSxJQUFJLEtBQUssU0FBUyxJQUNsQixDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxJQUNoQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUcsQ0FBQyxJQUN0QixDQUFDLEtBQUssQ0FBQyxRQUFRLElBQ2YsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUNqRDtnQkFDQSxNQUFNLENBQUMsSUFBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxFQUFFLENBQUM7WUFDTixPQUFPLElBQUksaUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdEMsTUFBTSxDQUFDLElBQUcsRUFBRSxJQUFJLEtBQUssTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDLEVBQUUsQ0FBQztZQUNOLE9BQU87Z0JBQ0wsTUFBTSxDQUFDLElBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hELENBQUM7UUFDSCxPQUFPLElBQUksVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDOUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEFBQUM7WUFFM0MsSUFBSSxNQUFNLEdBQUcsS0FBSyxBQUFDO1lBQ25CLElBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO2dCQUN2QyxNQUFNLEtBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQztnQkFFOUIsSUFBSSxLQUFJLEtBQUssR0FBRyxFQUFFO29CQUNoQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDOUIsU0FBUztnQkFDWCxDQUFDO2dCQUVELElBQUksV0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSSxDQUFDLEVBQUU7b0JBQ2pELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSSxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNoRCxNQUFNLEdBQUcsSUFBSSxDQUFDO29CQUNkLE1BQU07Z0JBQ1IsQ0FBQztnQkFFRCxJQUNFLFdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUMzQiwwQkFBMEIsSUFBSSxDQUFDLEtBQUksQ0FBQyxFQUNwQztvQkFDQSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDOUIsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDZCxNQUFNO2dCQUNSLENBQUM7Z0JBRUQsSUFBSSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLEVBQUU7b0JBQ2hELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQzFDLE1BQU0sR0FBRyxJQUFJLENBQUM7b0JBQ2QsTUFBTTtnQkFDUixPQUFPO29CQUNMLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdEUsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLENBQUMsSUFBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLElBQUksSUFBRyxLQUFLLEdBQUcsRUFBRTtnQkFDMUIsSUFDRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUNYLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUNoQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUcsQ0FBQyxJQUN0QixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBRyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQ2pEO29CQUNBLE1BQU0sQ0FBQyxJQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDOUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ04sT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksaUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzVELE1BQU0sQ0FBQyxJQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3pDLENBQUMsRUFBRSxDQUFDO2dCQUNOLE9BQU87b0JBQ0wsTUFBTSxDQUFDLElBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RCxDQUFDO1lBQ0gsQ0FBQztRQUNILE9BQU87WUFDTCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssRUFBRTtnQkFDdEQsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEUsQ0FBQztZQUNELElBQUksU0FBUyxFQUFFO2dCQUNiLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU07WUFDUixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFHLEVBQUUsTUFBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBRTtRQUNuRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDakMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFHLEVBQUUsTUFBSyxDQUFDLENBQUM7WUFFekIsSUFBSSxPQUFPLENBQUMsSUFBRyxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUcsQ0FBQyxDQUFFO29CQUM1QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFLLENBQUMsQ0FBQztnQkFDekIsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssTUFBTSxJQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUU7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sTUFBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEFBQUM7WUFDbkQsTUFBTSxDQUNKLElBQUksRUFDSixJQUFHLEVBQ0gsTUFBSyxFQUNMLEtBQUssQ0FDTixDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLE1BQU0sS0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFFO1FBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFHLENBQUMsRUFBRTtZQUM1RCxNQUFNLENBQ0osSUFBSSxFQUNKLEtBQUcsRUFDSCxFQUFFLEVBQ0YsS0FBSyxDQUNOLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksVUFBVSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNoQixLQUFLLE1BQU0sS0FBRyxJQUFJLFFBQVEsQ0FBRTtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDSCxPQUFPO1FBQ0wsS0FBSyxNQUFNLEtBQUcsSUFBSSxRQUFRLENBQUU7WUFDMUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLElBQUksQ0FBNkI7QUFDMUMsQ0FBQyJ9