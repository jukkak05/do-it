// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Provides the {@linkcode KeyStack} class which implements the
 * {@linkcode KeyRing} interface for managing rotatable keys.
 *
 * @module
 */ import { timingSafeEqual } from "./timing_safe_equal.ts";
import * as base64url from "../encoding/base64url.ts";
const encoder = new TextEncoder();
function importKey(key) {
    if (typeof key === "string") {
        key = encoder.encode(key);
    } else if (Array.isArray(key)) {
        key = new Uint8Array(key);
    }
    return crypto.subtle.importKey("raw", key, {
        name: "HMAC",
        hash: {
            name: "SHA-256"
        }
    }, true, [
        "sign",
        "verify"
    ]);
}
function sign(data, key) {
    if (typeof data === "string") {
        data = encoder.encode(data);
    } else if (Array.isArray(data)) {
        data = Uint8Array.from(data);
    }
    return crypto.subtle.sign("HMAC", key, data);
}
/** Compare two strings, Uint8Arrays, ArrayBuffers, or arrays of numbers in a
 * way that avoids timing based attacks on the comparisons on the values.
 *
 * The function will return `true` if the values match, or `false`, if they
 * do not match.
 *
 * This was inspired by https://github.com/suryagh/tsscmp which provides a
 * timing safe string comparison to avoid timing attacks as described in
 * https://codahale.com/a-lesson-in-timing-attacks/.
 */ async function compare(a, b) {
    const key = new Uint8Array(32);
    globalThis.crypto.getRandomValues(key);
    const cryptoKey = await importKey(key);
    const ah = await sign(a, cryptoKey);
    const bh = await sign(b, cryptoKey);
    return timingSafeEqual(ah, bh);
}
/** A cryptographic key chain which allows signing of data to prevent tampering,
 * but also allows for easy key rotation without needing to re-sign the data.
 *
 * Data is signed as SHA256 HMAC.
 *
 * This was inspired by [keygrip](https://github.com/crypto-utils/keygrip/).
 *
 * @example
 * ```ts
 * import { KeyStack } from "https://deno.land/std@$STD_VERSION/crypto/keystack.ts";
 *
 * const keyStack = new KeyStack(["hello", "world"]);
 * const digest = await keyStack.sign("some data");
 *
 * const rotatedStack = new KeyStack(["deno", "says", "hello", "world"]);
 * await rotatedStack.verify("some data", digest); // true
 * ```
 */ export class KeyStack {
    #cryptoKeys = new Map();
    #keys;
    async #toCryptoKey(key) {
        if (!this.#cryptoKeys.has(key)) {
            this.#cryptoKeys.set(key, await importKey(key));
        }
        return this.#cryptoKeys.get(key);
    }
    get length() {
        return this.#keys.length;
    }
    /** A class which accepts an array of keys that are used to sign and verify
   * data and allows easy key rotation without invalidation of previously signed
   * data.
   *
   * @param keys An iterable of keys, of which the index 0 will be used to sign
   *             data, but verification can happen against any key.
   */ constructor(keys){
        const values = Array.isArray(keys) ? keys : [
            ...keys
        ];
        if (!values.length) {
            throw new TypeError("keys must contain at least one value");
        }
        this.#keys = values;
    }
    /** Take `data` and return a SHA256 HMAC digest that uses the current 0 index
   * of the `keys` passed to the constructor.  This digest is in the form of a
   * URL safe base64 encoded string. */ async sign(data) {
        const key = await this.#toCryptoKey(this.#keys[0]);
        return base64url.encode(await sign(data, key));
    }
    /** Given `data` and a `digest`, verify that one of the `keys` provided the
   * constructor was used to generate the `digest`.  Returns `true` if one of
   * the keys was used, otherwise `false`. */ async verify(data, digest) {
        return await this.indexOf(data, digest) > -1;
    }
    /** Given `data` and a `digest`, return the current index of the key in the
   * `keys` passed the constructor that was used to generate the digest.  If no
   * key can be found, the method returns `-1`. */ async indexOf(data, digest) {
        for(let i = 0; i < this.#keys.length; i++){
            const cryptoKey = await this.#toCryptoKey(this.#keys[i]);
            if (await compare(digest, base64url.encode(await sign(data, cryptoKey)))) {
                return i;
            }
        }
        return -1;
    }
    [Symbol.for("Deno.customInspect")](inspect) {
        const { length  } = this;
        return `${this.constructor.name} ${inspect({
            length
        })}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")](depth, // deno-lint-ignore no-explicit-any
    options, inspect) {
        if (depth < 0) {
            return options.stylize(`[${this.constructor.name}]`, "special");
        }
        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1
        });
        const { length  } = this;
        return `${options.stylize(this.constructor.name, "special")} ${inspect({
            length
        }, newOptions)}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2NyeXB0by9rZXlzdGFjay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG4vKipcbiAqIFByb3ZpZGVzIHRoZSB7QGxpbmtjb2RlIEtleVN0YWNrfSBjbGFzcyB3aGljaCBpbXBsZW1lbnRzIHRoZVxuICoge0BsaW5rY29kZSBLZXlSaW5nfSBpbnRlcmZhY2UgZm9yIG1hbmFnaW5nIHJvdGF0YWJsZSBrZXlzLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0aW1pbmdTYWZlRXF1YWwgfSBmcm9tIFwiLi90aW1pbmdfc2FmZV9lcXVhbC50c1wiO1xuaW1wb3J0ICogYXMgYmFzZTY0dXJsIGZyb20gXCIuLi9lbmNvZGluZy9iYXNlNjR1cmwudHNcIjtcblxuLyoqIFR5cGVzIG9mIGRhdGEgdGhhdCBjYW4gYmUgc2lnbmVkIGNyeXB0b2dyYXBoaWNhbGx5LiAqL1xuZXhwb3J0IHR5cGUgRGF0YSA9IHN0cmluZyB8IG51bWJlcltdIHwgQXJyYXlCdWZmZXIgfCBVaW50OEFycmF5O1xuXG4vKiogVHlwZXMgb2Yga2V5cyB0aGF0IGNhbiBiZSB1c2VkIHRvIHNpZ24gZGF0YS4gKi9cbmV4cG9ydCB0eXBlIEtleSA9IHN0cmluZyB8IG51bWJlcltdIHwgQXJyYXlCdWZmZXIgfCBVaW50OEFycmF5O1xuXG5jb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG5cbmZ1bmN0aW9uIGltcG9ydEtleShrZXk6IEtleSk6IFByb21pc2U8Q3J5cHRvS2V5PiB7XG4gIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAga2V5ID0gZW5jb2Rlci5lbmNvZGUoa2V5KTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICBrZXkgPSBuZXcgVWludDhBcnJheShrZXkpO1xuICB9XG4gIHJldHVybiBjcnlwdG8uc3VidGxlLmltcG9ydEtleShcbiAgICBcInJhd1wiLFxuICAgIGtleSxcbiAgICB7XG4gICAgICBuYW1lOiBcIkhNQUNcIixcbiAgICAgIGhhc2g6IHsgbmFtZTogXCJTSEEtMjU2XCIgfSxcbiAgICB9LFxuICAgIHRydWUsXG4gICAgW1wic2lnblwiLCBcInZlcmlmeVwiXSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gc2lnbihkYXRhOiBEYXRhLCBrZXk6IENyeXB0b0tleSk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgZGF0YSA9IGVuY29kZXIuZW5jb2RlKGRhdGEpO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICBkYXRhID0gVWludDhBcnJheS5mcm9tKGRhdGEpO1xuICB9XG4gIHJldHVybiBjcnlwdG8uc3VidGxlLnNpZ24oXCJITUFDXCIsIGtleSwgZGF0YSk7XG59XG5cbi8qKiBDb21wYXJlIHR3byBzdHJpbmdzLCBVaW50OEFycmF5cywgQXJyYXlCdWZmZXJzLCBvciBhcnJheXMgb2YgbnVtYmVycyBpbiBhXG4gKiB3YXkgdGhhdCBhdm9pZHMgdGltaW5nIGJhc2VkIGF0dGFja3Mgb24gdGhlIGNvbXBhcmlzb25zIG9uIHRoZSB2YWx1ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIGB0cnVlYCBpZiB0aGUgdmFsdWVzIG1hdGNoLCBvciBgZmFsc2VgLCBpZiB0aGV5XG4gKiBkbyBub3QgbWF0Y2guXG4gKlxuICogVGhpcyB3YXMgaW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL3N1cnlhZ2gvdHNzY21wIHdoaWNoIHByb3ZpZGVzIGFcbiAqIHRpbWluZyBzYWZlIHN0cmluZyBjb21wYXJpc29uIHRvIGF2b2lkIHRpbWluZyBhdHRhY2tzIGFzIGRlc2NyaWJlZCBpblxuICogaHR0cHM6Ly9jb2RhaGFsZS5jb20vYS1sZXNzb24taW4tdGltaW5nLWF0dGFja3MvLlxuICovXG5hc3luYyBmdW5jdGlvbiBjb21wYXJlKGE6IERhdGEsIGI6IERhdGEpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3Qga2V5ID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBnbG9iYWxUaGlzLmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoa2V5KTtcbiAgY29uc3QgY3J5cHRvS2V5ID0gYXdhaXQgaW1wb3J0S2V5KGtleSk7XG4gIGNvbnN0IGFoID0gYXdhaXQgc2lnbihhLCBjcnlwdG9LZXkpO1xuICBjb25zdCBiaCA9IGF3YWl0IHNpZ24oYiwgY3J5cHRvS2V5KTtcbiAgcmV0dXJuIHRpbWluZ1NhZmVFcXVhbChhaCwgYmgpO1xufVxuXG4vKiogQSBjcnlwdG9ncmFwaGljIGtleSBjaGFpbiB3aGljaCBhbGxvd3Mgc2lnbmluZyBvZiBkYXRhIHRvIHByZXZlbnQgdGFtcGVyaW5nLFxuICogYnV0IGFsc28gYWxsb3dzIGZvciBlYXN5IGtleSByb3RhdGlvbiB3aXRob3V0IG5lZWRpbmcgdG8gcmUtc2lnbiB0aGUgZGF0YS5cbiAqXG4gKiBEYXRhIGlzIHNpZ25lZCBhcyBTSEEyNTYgSE1BQy5cbiAqXG4gKiBUaGlzIHdhcyBpbnNwaXJlZCBieSBba2V5Z3JpcF0oaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0by11dGlscy9rZXlncmlwLykuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBLZXlTdGFjayB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2NyeXB0by9rZXlzdGFjay50c1wiO1xuICpcbiAqIGNvbnN0IGtleVN0YWNrID0gbmV3IEtleVN0YWNrKFtcImhlbGxvXCIsIFwid29ybGRcIl0pO1xuICogY29uc3QgZGlnZXN0ID0gYXdhaXQga2V5U3RhY2suc2lnbihcInNvbWUgZGF0YVwiKTtcbiAqXG4gKiBjb25zdCByb3RhdGVkU3RhY2sgPSBuZXcgS2V5U3RhY2soW1wiZGVub1wiLCBcInNheXNcIiwgXCJoZWxsb1wiLCBcIndvcmxkXCJdKTtcbiAqIGF3YWl0IHJvdGF0ZWRTdGFjay52ZXJpZnkoXCJzb21lIGRhdGFcIiwgZGlnZXN0KTsgLy8gdHJ1ZVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBLZXlTdGFjayB7XG4gICNjcnlwdG9LZXlzID0gbmV3IE1hcDxLZXksIENyeXB0b0tleT4oKTtcbiAgI2tleXM6IEtleVtdO1xuXG4gIGFzeW5jICN0b0NyeXB0b0tleShrZXk6IEtleSk6IFByb21pc2U8Q3J5cHRvS2V5PiB7XG4gICAgaWYgKCF0aGlzLiNjcnlwdG9LZXlzLmhhcyhrZXkpKSB7XG4gICAgICB0aGlzLiNjcnlwdG9LZXlzLnNldChrZXksIGF3YWl0IGltcG9ydEtleShrZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI2NyeXB0b0tleXMuZ2V0KGtleSkhO1xuICB9XG5cbiAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNrZXlzLmxlbmd0aDtcbiAgfVxuXG4gIC8qKiBBIGNsYXNzIHdoaWNoIGFjY2VwdHMgYW4gYXJyYXkgb2Yga2V5cyB0aGF0IGFyZSB1c2VkIHRvIHNpZ24gYW5kIHZlcmlmeVxuICAgKiBkYXRhIGFuZCBhbGxvd3MgZWFzeSBrZXkgcm90YXRpb24gd2l0aG91dCBpbnZhbGlkYXRpb24gb2YgcHJldmlvdXNseSBzaWduZWRcbiAgICogZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIGtleXMgQW4gaXRlcmFibGUgb2Yga2V5cywgb2Ygd2hpY2ggdGhlIGluZGV4IDAgd2lsbCBiZSB1c2VkIHRvIHNpZ25cbiAgICogICAgICAgICAgICAgZGF0YSwgYnV0IHZlcmlmaWNhdGlvbiBjYW4gaGFwcGVuIGFnYWluc3QgYW55IGtleS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGtleXM6IEl0ZXJhYmxlPEtleT4pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBBcnJheS5pc0FycmF5KGtleXMpID8ga2V5cyA6IFsuLi5rZXlzXTtcbiAgICBpZiAoISh2YWx1ZXMubGVuZ3RoKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSB2YWx1ZVwiKTtcbiAgICB9XG4gICAgdGhpcy4ja2V5cyA9IHZhbHVlcztcbiAgfVxuXG4gIC8qKiBUYWtlIGBkYXRhYCBhbmQgcmV0dXJuIGEgU0hBMjU2IEhNQUMgZGlnZXN0IHRoYXQgdXNlcyB0aGUgY3VycmVudCAwIGluZGV4XG4gICAqIG9mIHRoZSBga2V5c2AgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3Rvci4gIFRoaXMgZGlnZXN0IGlzIGluIHRoZSBmb3JtIG9mIGFcbiAgICogVVJMIHNhZmUgYmFzZTY0IGVuY29kZWQgc3RyaW5nLiAqL1xuICBhc3luYyBzaWduKGRhdGE6IERhdGEpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGtleSA9IGF3YWl0IHRoaXMuI3RvQ3J5cHRvS2V5KHRoaXMuI2tleXNbMF0pO1xuICAgIHJldHVybiBiYXNlNjR1cmwuZW5jb2RlKGF3YWl0IHNpZ24oZGF0YSwga2V5KSk7XG4gIH1cblxuICAvKiogR2l2ZW4gYGRhdGFgIGFuZCBhIGBkaWdlc3RgLCB2ZXJpZnkgdGhhdCBvbmUgb2YgdGhlIGBrZXlzYCBwcm92aWRlZCB0aGVcbiAgICogY29uc3RydWN0b3Igd2FzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIGBkaWdlc3RgLiAgUmV0dXJucyBgdHJ1ZWAgaWYgb25lIG9mXG4gICAqIHRoZSBrZXlzIHdhcyB1c2VkLCBvdGhlcndpc2UgYGZhbHNlYC4gKi9cbiAgYXN5bmMgdmVyaWZ5KGRhdGE6IERhdGEsIGRpZ2VzdDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmluZGV4T2YoZGF0YSwgZGlnZXN0KSkgPiAtMTtcbiAgfVxuXG4gIC8qKiBHaXZlbiBgZGF0YWAgYW5kIGEgYGRpZ2VzdGAsIHJldHVybiB0aGUgY3VycmVudCBpbmRleCBvZiB0aGUga2V5IGluIHRoZVxuICAgKiBga2V5c2AgcGFzc2VkIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBkaWdlc3QuICBJZiBub1xuICAgKiBrZXkgY2FuIGJlIGZvdW5kLCB0aGUgbWV0aG9kIHJldHVybnMgYC0xYC4gKi9cbiAgYXN5bmMgaW5kZXhPZihkYXRhOiBEYXRhLCBkaWdlc3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLiNrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjcnlwdG9LZXkgPSBhd2FpdCB0aGlzLiN0b0NyeXB0b0tleSh0aGlzLiNrZXlzW2ldKTtcbiAgICAgIGlmIChcbiAgICAgICAgYXdhaXQgY29tcGFyZShkaWdlc3QsIGJhc2U2NHVybC5lbmNvZGUoYXdhaXQgc2lnbihkYXRhLCBjcnlwdG9LZXkpKSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nKSB7XG4gICAgY29uc3QgeyBsZW5ndGggfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gJHtpbnNwZWN0KHsgbGVuZ3RoIH0pfWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgKSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHsgbGVuZ3RoIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KHsgbGVuZ3RoIH0sIG5ld09wdGlvbnMpXG4gICAgfWA7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7OztDQUtDLEdBRUQsU0FBUyxlQUFlLFFBQVEsd0JBQXdCLENBQUM7QUFDekQsWUFBWSxTQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFRdEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQUFBQztBQUVsQyxTQUFTLFNBQVMsQ0FBQyxHQUFRLEVBQXNCO0lBQy9DLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO1FBQzNCLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzdCLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDNUIsS0FBSyxFQUNMLEdBQUcsRUFDSDtRQUNFLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFF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