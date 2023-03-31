// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Extensions to the
 * [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
 * supporting additional encryption APIs, but also delegating to the built-in
 * APIs when possible.
 *
 * Provides additional digest algorithms that are not part of the WebCrypto
 * standard as well as a `subtle.digest` and `subtle.digestSync` methods. It
 * also provides a `subtle.timingSafeEqual()` method to compare array buffers
 * or data views in a way that isn't prone to timing based attacks.
 *
 * The "polyfill" delegates to `WebCrypto` where possible.
 *
 * The {@linkcode KeyStack} export implements the {@linkcode KeyRing} interface
 * for managing rotatable keys for signing data to prevent tampering, like with
 * HTTP cookies.
 *
 * ## Supported algorithms
 *
 * Here is a list of supported algorithms. If the algorithm name in WebCrypto
 * and Wasm/Rust is the same, this library prefers to use algorithms that are
 * supported by WebCrypto.
 *
 * WebCrypto
 *
 * ```ts
 * // https://deno.land/std/crypto/crypto.ts
 * const webCryptoDigestAlgorithms = [
 *   "SHA-384",
 *   "SHA-256",
 *   "SHA-512",
 *   // insecure (length-extendable and collidable):
 *   "SHA-1",
 * ] as const;
 * ```
 *
 * Wasm/Rust
 *
 * ```ts
 * // https://deno.land/std/_wasm_crypto/crypto.ts
 * export const digestAlgorithms = [
 *   "BLAKE2B-256",
 *   "BLAKE2B-384",
 *   "BLAKE2B",
 *   "BLAKE2S",
 *   "BLAKE3",
 *   "KECCAK-224",
 *   "KECCAK-256",
 *   "KECCAK-384",
 *   "KECCAK-512",
 *   "SHA-384",
 *   "SHA3-224",
 *   "SHA3-256",
 *   "SHA3-384",
 *   "SHA3-512",
 *   "SHAKE128",
 *   "SHAKE256",
 *   "TIGER",
 *   // insecure (length-extendable):
 *   "RIPEMD-160",
 *   "SHA-224",
 *   "SHA-256",
 *   "SHA-512",
 *   // insecure (collidable and length-extendable):
 *   "MD5",
 *   "SHA-1",
 * ] as const;
 * ```
 *
 * ## Timing safe comparison
 *
 * When checking the values of cryptographic hashes are equal, default
 * comparisons can be susceptible to timing based attacks, where attacker is
 * able to find out information about the host system by repeatedly checking
 * response times to equality comparisons of values.
 *
 * It is likely some form of timing safe equality will make its way to the
 * WebCrypto standard (see:
 * [w3c/webcrypto#270](https://github.com/w3c/webcrypto/issues/270)), but until
 * that time, `timingSafeEqual()` is provided:
 *
 * ```ts
 * import { crypto } from "https://deno.land/std@$STD_VERSION/crypto/mod.ts";
 * import { assert } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * const a = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 * const b = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 * const c = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello deno"),
 * );
 *
 * assert(crypto.subtle.timingSafeEqual(a, b));
 * assert(!crypto.subtle.timingSafeEqual(a, c));
 * ```
 *
 * In addition to the method being part of the `crypto.subtle` interface, it is
 * also loadable directly:
 *
 * ```ts
 * import { timingSafeEqual } from "https://deno.land/std@$STD_VERSION/crypto/timing_safe_equal.ts";
 * import { assert } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * const a = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 * const b = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 *
 * assert(timingSafeEqual(a, b));
 * ```
 *
 * @example
 * ```ts
 * import { crypto } from "https://deno.land/std@$STD_VERSION/crypto/mod.ts";
 *
 * // This will delegate to the runtime's WebCrypto implementation.
 * console.log(
 *   new Uint8Array(
 *     await crypto.subtle.digest(
 *       "SHA-384",
 *       new TextEncoder().encode("hello world"),
 *     ),
 *   ),
 * );
 *
 * // This will use a bundled Wasm/Rust implementation.
 * console.log(
 *   new Uint8Array(
 *     await crypto.subtle.digest(
 *       "BLAKE3",
 *       new TextEncoder().encode("hello world"),
 *     ),
 *   ),
 * );
 * ```
 *
 * @example Convert hash to a string
 *
 * ```ts
 * import {
 *   crypto,
 *   toHashString,
 * } from "https://deno.land/std@$STD_VERSION/crypto/mod.ts";
 *
 * const hash = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("You hear that Mr. Anderson?"),
 * );
 *
 * // Hex encoding by default
 * console.log(toHashString(hash));
 *
 * // Or with base64 encoding
 * console.log(toHashString(hash, "base64"));
 * ```
 *
 * @module
 */ import { digestAlgorithms as wasmDigestAlgorithms, instantiateWasm } from "./_wasm/mod.ts";
import { timingSafeEqual } from "./timing_safe_equal.ts";
import { fnv } from "./_fnv/mod.ts";
/**
 * A copy of the global WebCrypto interface, with methods bound so they're
 * safe to re-export.
 */ const webCrypto = ((crypto)=>({
        getRandomValues: crypto.getRandomValues?.bind(crypto),
        randomUUID: crypto.randomUUID?.bind(crypto),
        subtle: {
            decrypt: crypto.subtle?.decrypt?.bind(crypto.subtle),
            deriveBits: crypto.subtle?.deriveBits?.bind(crypto.subtle),
            deriveKey: crypto.subtle?.deriveKey?.bind(crypto.subtle),
            digest: crypto.subtle?.digest?.bind(crypto.subtle),
            encrypt: crypto.subtle?.encrypt?.bind(crypto.subtle),
            exportKey: crypto.subtle?.exportKey?.bind(crypto.subtle),
            generateKey: crypto.subtle?.generateKey?.bind(crypto.subtle),
            importKey: crypto.subtle?.importKey?.bind(crypto.subtle),
            sign: crypto.subtle?.sign?.bind(crypto.subtle),
            unwrapKey: crypto.subtle?.unwrapKey?.bind(crypto.subtle),
            verify: crypto.subtle?.verify?.bind(crypto.subtle),
            wrapKey: crypto.subtle?.wrapKey?.bind(crypto.subtle)
        }
    }))(globalThis.crypto);
const bufferSourceBytes = (data)=>{
    let bytes;
    if (data instanceof Uint8Array) {
        bytes = data;
    } else if (ArrayBuffer.isView(data)) {
        bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
    }
    return bytes;
};
/**
 * An wrapper for WebCrypto adding support for additional non-standard
 * algorithms, but delegating to the runtime WebCrypto implementation whenever
 * possible.
 */ const stdCrypto = ((x)=>x)({
    ...webCrypto,
    subtle: {
        ...webCrypto.subtle,
        /**
     * Polyfills stream support until the Web Crypto API does so:
     * @see {@link https://github.com/wintercg/proposal-webcrypto-streams}
     */ async digest (algorithm, data) {
            const { name , length  } = normalizeAlgorithm(algorithm);
            const bytes = bufferSourceBytes(data);
            if (FNVAlgorithms.includes(name)) {
                return fnv(name, bytes);
            }
            // We delegate to WebCrypto whenever possible,
            if (// if the algorithm is supported by the WebCrypto standard,
            (webCryptoDigestAlgorithms).includes(name) && // and the data is a single buffer,
            bytes) {
                return webCrypto.subtle.digest(algorithm, bytes);
            } else if (wasmDigestAlgorithms.includes(name)) {
                if (bytes) {
                    // Otherwise, we use our bundled Wasm implementation via digestSync
                    // if it supports the algorithm.
                    return stdCrypto.subtle.digestSync(algorithm, bytes);
                } else if (data[Symbol.iterator]) {
                    return stdCrypto.subtle.digestSync(algorithm, data);
                } else if (data[Symbol.asyncIterator]) {
                    const wasmCrypto = instantiateWasm();
                    const context = new wasmCrypto.DigestContext(name);
                    for await (const chunk of data){
                        const chunkBytes = bufferSourceBytes(chunk);
                        if (!chunkBytes) {
                            throw new TypeError("data contained chunk of the wrong type");
                        }
                        context.update(chunkBytes);
                    }
                    return context.digestAndDrop(length).buffer;
                } else {
                    throw new TypeError("data must be a BufferSource or [Async]Iterable<BufferSource>");
                }
            } else if (webCrypto.subtle?.digest) {
                // (TypeScript type definitions prohibit this case.) If they're trying
                // to call an algorithm we don't recognize, pass it along to WebCrypto
                // in case it's a non-standard algorithm supported by the the runtime
                // they're using.
                return webCrypto.subtle.digest(algorithm, data);
            } else {
                throw new TypeError(`unsupported digest algorithm: ${algorithm}`);
            }
        },
        digestSync (algorithm, data) {
            algorithm = normalizeAlgorithm(algorithm);
            const bytes = bufferSourceBytes(data);
            if (FNVAlgorithms.includes(algorithm.name)) {
                return fnv(algorithm.name, bytes);
            }
            const wasmCrypto = instantiateWasm();
            if (bytes) {
                return wasmCrypto.digest(algorithm.name, bytes, algorithm.length).buffer;
            } else if (data[Symbol.iterator]) {
                const context = new wasmCrypto.DigestContext(algorithm.name);
                for (const chunk of data){
                    const chunkBytes = bufferSourceBytes(chunk);
                    if (!chunkBytes) {
                        throw new TypeError("data contained chunk of the wrong type");
                    }
                    context.update(chunkBytes);
                }
                return context.digestAndDrop(algorithm.length).buffer;
            } else {
                throw new TypeError("data must be a BufferSource or Iterable<BufferSource>");
            }
        },
        // TODO(@kitsonk): rework when https://github.com/w3c/webcrypto/issues/270 resolved
        timingSafeEqual
    }
});
const FNVAlgorithms = [
    "FNV32",
    "FNV32A",
    "FNV64",
    "FNV64A"
];
/** Digest algorithms supported by WebCrypto. */ const webCryptoDigestAlgorithms = [
    "SHA-384",
    "SHA-256",
    "SHA-512",
    // insecure (length-extendable and collidable):
    "SHA-1", 
];
const normalizeAlgorithm = (algorithm)=>typeof algorithm === "string" ? {
        name: algorithm.toUpperCase()
    } : {
        ...algorithm,
        name: algorithm.name.toUpperCase()
    };
export { stdCrypto as crypto };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2NyeXB0by9jcnlwdG8udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBFeHRlbnNpb25zIHRvIHRoZVxuICogW1dlYiBDcnlwdG9dKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XZWJfQ3J5cHRvX0FQSSlcbiAqIHN1cHBvcnRpbmcgYWRkaXRpb25hbCBlbmNyeXB0aW9uIEFQSXMsIGJ1dCBhbHNvIGRlbGVnYXRpbmcgdG8gdGhlIGJ1aWx0LWluXG4gKiBBUElzIHdoZW4gcG9zc2libGUuXG4gKlxuICogUHJvdmlkZXMgYWRkaXRpb25hbCBkaWdlc3QgYWxnb3JpdGhtcyB0aGF0IGFyZSBub3QgcGFydCBvZiB0aGUgV2ViQ3J5cHRvXG4gKiBzdGFuZGFyZCBhcyB3ZWxsIGFzIGEgYHN1YnRsZS5kaWdlc3RgIGFuZCBgc3VidGxlLmRpZ2VzdFN5bmNgIG1ldGhvZHMuIEl0XG4gKiBhbHNvIHByb3ZpZGVzIGEgYHN1YnRsZS50aW1pbmdTYWZlRXF1YWwoKWAgbWV0aG9kIHRvIGNvbXBhcmUgYXJyYXkgYnVmZmVyc1xuICogb3IgZGF0YSB2aWV3cyBpbiBhIHdheSB0aGF0IGlzbid0IHByb25lIHRvIHRpbWluZyBiYXNlZCBhdHRhY2tzLlxuICpcbiAqIFRoZSBcInBvbHlmaWxsXCIgZGVsZWdhdGVzIHRvIGBXZWJDcnlwdG9gIHdoZXJlIHBvc3NpYmxlLlxuICpcbiAqIFRoZSB7QGxpbmtjb2RlIEtleVN0YWNrfSBleHBvcnQgaW1wbGVtZW50cyB0aGUge0BsaW5rY29kZSBLZXlSaW5nfSBpbnRlcmZhY2VcbiAqIGZvciBtYW5hZ2luZyByb3RhdGFibGUga2V5cyBmb3Igc2lnbmluZyBkYXRhIHRvIHByZXZlbnQgdGFtcGVyaW5nLCBsaWtlIHdpdGhcbiAqIEhUVFAgY29va2llcy5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgYWxnb3JpdGhtc1xuICpcbiAqIEhlcmUgaXMgYSBsaXN0IG9mIHN1cHBvcnRlZCBhbGdvcml0aG1zLiBJZiB0aGUgYWxnb3JpdGhtIG5hbWUgaW4gV2ViQ3J5cHRvXG4gKiBhbmQgV2FzbS9SdXN0IGlzIHRoZSBzYW1lLCB0aGlzIGxpYnJhcnkgcHJlZmVycyB0byB1c2UgYWxnb3JpdGhtcyB0aGF0IGFyZVxuICogc3VwcG9ydGVkIGJ5IFdlYkNyeXB0by5cbiAqXG4gKiBXZWJDcnlwdG9cbiAqXG4gKiBgYGB0c1xuICogLy8gaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL2NyeXB0by9jcnlwdG8udHNcbiAqIGNvbnN0IHdlYkNyeXB0b0RpZ2VzdEFsZ29yaXRobXMgPSBbXG4gKiAgIFwiU0hBLTM4NFwiLFxuICogICBcIlNIQS0yNTZcIixcbiAqICAgXCJTSEEtNTEyXCIsXG4gKiAgIC8vIGluc2VjdXJlIChsZW5ndGgtZXh0ZW5kYWJsZSBhbmQgY29sbGlkYWJsZSk6XG4gKiAgIFwiU0hBLTFcIixcbiAqIF0gYXMgY29uc3Q7XG4gKiBgYGBcbiAqXG4gKiBXYXNtL1J1c3RcbiAqXG4gKiBgYGB0c1xuICogLy8gaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL193YXNtX2NyeXB0by9jcnlwdG8udHNcbiAqIGV4cG9ydCBjb25zdCBkaWdlc3RBbGdvcml0aG1zID0gW1xuICogICBcIkJMQUtFMkItMjU2XCIsXG4gKiAgIFwiQkxBS0UyQi0zODRcIixcbiAqICAgXCJCTEFLRTJCXCIsXG4gKiAgIFwiQkxBS0UyU1wiLFxuICogICBcIkJMQUtFM1wiLFxuICogICBcIktFQ0NBSy0yMjRcIixcbiAqICAgXCJLRUNDQUstMjU2XCIsXG4gKiAgIFwiS0VDQ0FLLTM4NFwiLFxuICogICBcIktFQ0NBSy01MTJcIixcbiAqICAgXCJTSEEtMzg0XCIsXG4gKiAgIFwiU0hBMy0yMjRcIixcbiAqICAgXCJTSEEzLTI1NlwiLFxuICogICBcIlNIQTMtMzg0XCIsXG4gKiAgIFwiU0hBMy01MTJcIixcbiAqICAgXCJTSEFLRTEyOFwiLFxuICogICBcIlNIQUtFMjU2XCIsXG4gKiAgIFwiVElHRVJcIixcbiAqICAgLy8gaW5zZWN1cmUgKGxlbmd0aC1leHRlbmRhYmxlKTpcbiAqICAgXCJSSVBFTUQtMTYwXCIsXG4gKiAgIFwiU0hBLTIyNFwiLFxuICogICBcIlNIQS0yNTZcIixcbiAqICAgXCJTSEEtNTEyXCIsXG4gKiAgIC8vIGluc2VjdXJlIChjb2xsaWRhYmxlIGFuZCBsZW5ndGgtZXh0ZW5kYWJsZSk6XG4gKiAgIFwiTUQ1XCIsXG4gKiAgIFwiU0hBLTFcIixcbiAqIF0gYXMgY29uc3Q7XG4gKiBgYGBcbiAqXG4gKiAjIyBUaW1pbmcgc2FmZSBjb21wYXJpc29uXG4gKlxuICogV2hlbiBjaGVja2luZyB0aGUgdmFsdWVzIG9mIGNyeXB0b2dyYXBoaWMgaGFzaGVzIGFyZSBlcXVhbCwgZGVmYXVsdFxuICogY29tcGFyaXNvbnMgY2FuIGJlIHN1c2NlcHRpYmxlIHRvIHRpbWluZyBiYXNlZCBhdHRhY2tzLCB3aGVyZSBhdHRhY2tlciBpc1xuICogYWJsZSB0byBmaW5kIG91dCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgaG9zdCBzeXN0ZW0gYnkgcmVwZWF0ZWRseSBjaGVja2luZ1xuICogcmVzcG9uc2UgdGltZXMgdG8gZXF1YWxpdHkgY29tcGFyaXNvbnMgb2YgdmFsdWVzLlxuICpcbiAqIEl0IGlzIGxpa2VseSBzb21lIGZvcm0gb2YgdGltaW5nIHNhZmUgZXF1YWxpdHkgd2lsbCBtYWtlIGl0cyB3YXkgdG8gdGhlXG4gKiBXZWJDcnlwdG8gc3RhbmRhcmQgKHNlZTpcbiAqIFt3M2Mvd2ViY3J5cHRvIzI3MF0oaHR0cHM6Ly9naXRodWIuY29tL3czYy93ZWJjcnlwdG8vaXNzdWVzLzI3MCkpLCBidXQgdW50aWxcbiAqIHRoYXQgdGltZSwgYHRpbWluZ1NhZmVFcXVhbCgpYCBpcyBwcm92aWRlZDpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY3J5cHRvIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vY3J5cHRvL21vZC50c1wiO1xuICogaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vdGVzdGluZy9hc3NlcnRzLnRzXCI7XG4gKlxuICogY29uc3QgYSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFxuICogICBcIlNIQS0zODRcIixcbiAqICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiaGVsbG8gd29ybGRcIiksXG4gKiApO1xuICogY29uc3QgYiA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFxuICogICBcIlNIQS0zODRcIixcbiAqICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiaGVsbG8gd29ybGRcIiksXG4gKiApO1xuICogY29uc3QgYyA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFxuICogICBcIlNIQS0zODRcIixcbiAqICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiaGVsbG8gZGVub1wiKSxcbiAqICk7XG4gKlxuICogYXNzZXJ0KGNyeXB0by5zdWJ0bGUudGltaW5nU2FmZUVxdWFsKGEsIGIpKTtcbiAqIGFzc2VydCghY3J5cHRvLnN1YnRsZS50aW1pbmdTYWZlRXF1YWwoYSwgYykpO1xuICogYGBgXG4gKlxuICogSW4gYWRkaXRpb24gdG8gdGhlIG1ldGhvZCBiZWluZyBwYXJ0IG9mIHRoZSBgY3J5cHRvLnN1YnRsZWAgaW50ZXJmYWNlLCBpdCBpc1xuICogYWxzbyBsb2FkYWJsZSBkaXJlY3RseTpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdGltaW5nU2FmZUVxdWFsIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vY3J5cHRvL3RpbWluZ19zYWZlX2VxdWFsLnRzXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBjb25zdCBhID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gKiAgIFwiU0hBLTM4NFwiLFxuICogICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJoZWxsbyB3b3JsZFwiKSxcbiAqICk7XG4gKiBjb25zdCBiID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gKiAgIFwiU0hBLTM4NFwiLFxuICogICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJoZWxsbyB3b3JsZFwiKSxcbiAqICk7XG4gKlxuICogYXNzZXJ0KHRpbWluZ1NhZmVFcXVhbChhLCBiKSk7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNyeXB0byB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2NyeXB0by9tb2QudHNcIjtcbiAqXG4gKiAvLyBUaGlzIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHJ1bnRpbWUncyBXZWJDcnlwdG8gaW1wbGVtZW50YXRpb24uXG4gKiBjb25zb2xlLmxvZyhcbiAqICAgbmV3IFVpbnQ4QXJyYXkoXG4gKiAgICAgYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gKiAgICAgICBcIlNIQS0zODRcIixcbiAqICAgICAgIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcImhlbGxvIHdvcmxkXCIpLFxuICogICAgICksXG4gKiAgICksXG4gKiApO1xuICpcbiAqIC8vIFRoaXMgd2lsbCB1c2UgYSBidW5kbGVkIFdhc20vUnVzdCBpbXBsZW1lbnRhdGlvbi5cbiAqIGNvbnNvbGUubG9nKFxuICogICBuZXcgVWludDhBcnJheShcbiAqICAgICBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcbiAqICAgICAgIFwiQkxBS0UzXCIsXG4gKiAgICAgICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJoZWxsbyB3b3JsZFwiKSxcbiAqICAgICApLFxuICogICApLFxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlIENvbnZlcnQgaGFzaCB0byBhIHN0cmluZ1xuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICBjcnlwdG8sXG4gKiAgIHRvSGFzaFN0cmluZyxcbiAqIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vY3J5cHRvL21vZC50c1wiO1xuICpcbiAqIGNvbnN0IGhhc2ggPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcbiAqICAgXCJTSEEtMzg0XCIsXG4gKiAgIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIllvdSBoZWFyIHRoYXQgTXIuIEFuZGVyc29uP1wiKSxcbiAqICk7XG4gKlxuICogLy8gSGV4IGVuY29kaW5nIGJ5IGRlZmF1bHRcbiAqIGNvbnNvbGUubG9nKHRvSGFzaFN0cmluZyhoYXNoKSk7XG4gKlxuICogLy8gT3Igd2l0aCBiYXNlNjQgZW5jb2RpbmdcbiAqIGNvbnNvbGUubG9nKHRvSGFzaFN0cmluZyhoYXNoLCBcImJhc2U2NFwiKSk7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHtcbiAgRGlnZXN0QWxnb3JpdGhtIGFzIFdhc21EaWdlc3RBbGdvcml0aG0sXG4gIGRpZ2VzdEFsZ29yaXRobXMgYXMgd2FzbURpZ2VzdEFsZ29yaXRobXMsXG4gIGluc3RhbnRpYXRlV2FzbSxcbn0gZnJvbSBcIi4vX3dhc20vbW9kLnRzXCI7XG5pbXBvcnQgeyB0aW1pbmdTYWZlRXF1YWwgfSBmcm9tIFwiLi90aW1pbmdfc2FmZV9lcXVhbC50c1wiO1xuaW1wb3J0IHsgZm52IH0gZnJvbSBcIi4vX2Zudi9tb2QudHNcIjtcblxuLyoqXG4gKiBBIGNvcHkgb2YgdGhlIGdsb2JhbCBXZWJDcnlwdG8gaW50ZXJmYWNlLCB3aXRoIG1ldGhvZHMgYm91bmQgc28gdGhleSdyZVxuICogc2FmZSB0byByZS1leHBvcnQuXG4gKi9cbmNvbnN0IHdlYkNyeXB0byA9ICgoY3J5cHRvKSA9PiAoe1xuICBnZXRSYW5kb21WYWx1ZXM6IGNyeXB0by5nZXRSYW5kb21WYWx1ZXM/LmJpbmQoY3J5cHRvKSxcbiAgcmFuZG9tVVVJRDogY3J5cHRvLnJhbmRvbVVVSUQ/LmJpbmQoY3J5cHRvKSxcbiAgc3VidGxlOiB7XG4gICAgZGVjcnlwdDogY3J5cHRvLnN1YnRsZT8uZGVjcnlwdD8uYmluZChjcnlwdG8uc3VidGxlKSxcbiAgICBkZXJpdmVCaXRzOiBjcnlwdG8uc3VidGxlPy5kZXJpdmVCaXRzPy5iaW5kKGNyeXB0by5zdWJ0bGUpLFxuICAgIGRlcml2ZUtleTogY3J5cHRvLnN1YnRsZT8uZGVyaXZlS2V5Py5iaW5kKGNyeXB0by5zdWJ0bGUpLFxuICAgIGRpZ2VzdDogY3J5cHRvLnN1YnRsZT8uZGlnZXN0Py5iaW5kKGNyeXB0by5zdWJ0bGUpLFxuICAgIGVuY3J5cHQ6IGNyeXB0by5zdWJ0bGU/LmVuY3J5cHQ/LmJpbmQoY3J5cHRvLnN1YnRsZSksXG4gICAgZXhwb3J0S2V5OiBjcnlwdG8uc3VidGxlPy5leHBvcnRLZXk/LmJpbmQoY3J5cHRvLnN1YnRsZSksXG4gICAgZ2VuZXJhdGVLZXk6IGNyeXB0by5zdWJ0bGU/LmdlbmVyYXRlS2V5Py5iaW5kKGNyeXB0by5zdWJ0bGUpLFxuICAgIGltcG9ydEtleTogY3J5cHRvLnN1YnRsZT8uaW1wb3J0S2V5Py5iaW5kKGNyeXB0by5zdWJ0bGUpLFxuICAgIHNpZ246IGNyeXB0by5zdWJ0bGU/LnNpZ24/LmJpbmQoY3J5cHRvLnN1YnRsZSksXG4gICAgdW53cmFwS2V5OiBjcnlwdG8uc3VidGxlPy51bndyYXBLZXk/LmJpbmQoY3J5cHRvLnN1YnRsZSksXG4gICAgdmVyaWZ5OiBjcnlwdG8uc3VidGxlPy52ZXJpZnk/LmJpbmQoY3J5cHRvLnN1YnRsZSksXG4gICAgd3JhcEtleTogY3J5cHRvLnN1YnRsZT8ud3JhcEtleT8uYmluZChjcnlwdG8uc3VidGxlKSxcbiAgfSxcbn0pKShnbG9iYWxUaGlzLmNyeXB0byk7XG5cbmNvbnN0IGJ1ZmZlclNvdXJjZUJ5dGVzID0gKGRhdGE6IEJ1ZmZlclNvdXJjZSB8IHVua25vd24pID0+IHtcbiAgbGV0IGJ5dGVzOiBVaW50OEFycmF5IHwgdW5kZWZpbmVkO1xuICBpZiAoZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICBieXRlcyA9IGRhdGE7XG4gIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGRhdGEpKSB7XG4gICAgYnl0ZXMgPSBuZXcgVWludDhBcnJheShkYXRhLmJ1ZmZlciwgZGF0YS5ieXRlT2Zmc2V0LCBkYXRhLmJ5dGVMZW5ndGgpO1xuICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG4gIH1cbiAgcmV0dXJuIGJ5dGVzO1xufTtcblxuLyoqIEV4dGVuc2lvbnMgdG8gdGhlIHdlYiBzdGFuZGFyZCBgU3VidGxlQ3J5cHRvYCBpbnRlcmZhY2UuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0ZFN1YnRsZUNyeXB0byBleHRlbmRzIFN1YnRsZUNyeXB0byB7XG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmV3IGBQcm9taXNlYCBvYmplY3QgdGhhdCB3aWxsIGRpZ2VzdCBgZGF0YWAgdXNpbmcgdGhlIHNwZWNpZmllZFxuICAgKiBgQWxnb3JpdGhtSWRlbnRpZmllcmAuXG4gICAqL1xuICBkaWdlc3QoXG4gICAgYWxnb3JpdGhtOiBEaWdlc3RBbGdvcml0aG0sXG4gICAgZGF0YTogQnVmZmVyU291cmNlIHwgQXN5bmNJdGVyYWJsZTxCdWZmZXJTb3VyY2U+IHwgSXRlcmFibGU8QnVmZmVyU291cmNlPixcbiAgKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj47XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBBcnJheUJ1ZmZlciB3aXRoIHRoZSByZXN1bHQgb2YgZGlnZXN0aW5nIGBkYXRhYCB1c2luZyB0aGVcbiAgICogc3BlY2lmaWVkIGBBbGdvcml0aG1JZGVudGlmaWVyYC5cbiAgICovXG4gIGRpZ2VzdFN5bmMoXG4gICAgYWxnb3JpdGhtOiBEaWdlc3RBbGdvcml0aG0sXG4gICAgZGF0YTogQnVmZmVyU291cmNlIHwgSXRlcmFibGU8QnVmZmVyU291cmNlPixcbiAgKTogQXJyYXlCdWZmZXI7XG5cbiAgLyoqIENvbXBhcmUgdG8gYXJyYXkgYnVmZmVycyBvciBkYXRhIHZpZXdzIGluIGEgd2F5IHRoYXQgdGltaW5nIGJhc2VkIGF0dGFja3NcbiAgICogY2Fubm90IGdhaW4gaW5mb3JtYXRpb24gYWJvdXQgdGhlIHBsYXRmb3JtLiAqL1xuICB0aW1pbmdTYWZlRXF1YWwoXG4gICAgYTogQXJyYXlCdWZmZXJMaWtlIHwgRGF0YVZpZXcsXG4gICAgYjogQXJyYXlCdWZmZXJMaWtlIHwgRGF0YVZpZXcsXG4gICk6IGJvb2xlYW47XG59XG5cbi8qKiBFeHRlbnNpb25zIHRvIHRoZSBXZWIge0BsaW5rY29kZSBDcnlwdG99IGludGVyZmFjZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RkQ3J5cHRvIGV4dGVuZHMgQ3J5cHRvIHtcbiAgcmVhZG9ubHkgc3VidGxlOiBTdGRTdWJ0bGVDcnlwdG87XG59XG5cbi8qKlxuICogQW4gd3JhcHBlciBmb3IgV2ViQ3J5cHRvIGFkZGluZyBzdXBwb3J0IGZvciBhZGRpdGlvbmFsIG5vbi1zdGFuZGFyZFxuICogYWxnb3JpdGhtcywgYnV0IGRlbGVnYXRpbmcgdG8gdGhlIHJ1bnRpbWUgV2ViQ3J5cHRvIGltcGxlbWVudGF0aW9uIHdoZW5ldmVyXG4gKiBwb3NzaWJsZS5cbiAqL1xuY29uc3Qgc3RkQ3J5cHRvOiBTdGRDcnlwdG8gPSAoKHgpID0+IHgpKHtcbiAgLi4ud2ViQ3J5cHRvLFxuICBzdWJ0bGU6IHtcbiAgICAuLi53ZWJDcnlwdG8uc3VidGxlLFxuXG4gICAgLyoqXG4gICAgICogUG9seWZpbGxzIHN0cmVhbSBzdXBwb3J0IHVudGlsIHRoZSBXZWIgQ3J5cHRvIEFQSSBkb2VzIHNvOlxuICAgICAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS93aW50ZXJjZy9wcm9wb3NhbC13ZWJjcnlwdG8tc3RyZWFtc31cbiAgICAgKi9cbiAgICBhc3luYyBkaWdlc3QoXG4gICAgICBhbGdvcml0aG06IERpZ2VzdEFsZ29yaXRobSxcbiAgICAgIGRhdGE6IEJ1ZmZlclNvdXJjZSB8IEFzeW5jSXRlcmFibGU8QnVmZmVyU291cmNlPiB8IEl0ZXJhYmxlPEJ1ZmZlclNvdXJjZT4sXG4gICAgKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgICAgY29uc3QgeyBuYW1lLCBsZW5ndGggfSA9IG5vcm1hbGl6ZUFsZ29yaXRobShhbGdvcml0aG0pO1xuICAgICAgY29uc3QgYnl0ZXMgPSBidWZmZXJTb3VyY2VCeXRlcyhkYXRhKTtcblxuICAgICAgaWYgKEZOVkFsZ29yaXRobXMuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGZudihuYW1lLCBieXRlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGRlbGVnYXRlIHRvIFdlYkNyeXB0byB3aGVuZXZlciBwb3NzaWJsZSxcbiAgICAgIGlmIChcbiAgICAgICAgLy8gaWYgdGhlIGFsZ29yaXRobSBpcyBzdXBwb3J0ZWQgYnkgdGhlIFdlYkNyeXB0byBzdGFuZGFyZCxcbiAgICAgICAgKHdlYkNyeXB0b0RpZ2VzdEFsZ29yaXRobXMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG5hbWUpICYmXG4gICAgICAgIC8vIGFuZCB0aGUgZGF0YSBpcyBhIHNpbmdsZSBidWZmZXIsXG4gICAgICAgIGJ5dGVzXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHdlYkNyeXB0by5zdWJ0bGUuZGlnZXN0KGFsZ29yaXRobSwgYnl0ZXMpO1xuICAgICAgfSBlbHNlIGlmICh3YXNtRGlnZXN0QWxnb3JpdGhtcy5pbmNsdWRlcyhuYW1lIGFzIFdhc21EaWdlc3RBbGdvcml0aG0pKSB7XG4gICAgICAgIGlmIChieXRlcykge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSwgd2UgdXNlIG91ciBidW5kbGVkIFdhc20gaW1wbGVtZW50YXRpb24gdmlhIGRpZ2VzdFN5bmNcbiAgICAgICAgICAvLyBpZiBpdCBzdXBwb3J0cyB0aGUgYWxnb3JpdGhtLlxuICAgICAgICAgIHJldHVybiBzdGRDcnlwdG8uc3VidGxlLmRpZ2VzdFN5bmMoYWxnb3JpdGhtLCBieXRlcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoKGRhdGEgYXMgSXRlcmFibGU8QnVmZmVyU291cmNlPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgICAgIHJldHVybiBzdGRDcnlwdG8uc3VidGxlLmRpZ2VzdFN5bmMoXG4gICAgICAgICAgICBhbGdvcml0aG0sXG4gICAgICAgICAgICBkYXRhIGFzIEl0ZXJhYmxlPEJ1ZmZlclNvdXJjZT4sXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAoZGF0YSBhcyBBc3luY0l0ZXJhYmxlPEJ1ZmZlclNvdXJjZT4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXVxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCB3YXNtQ3J5cHRvID0gaW5zdGFudGlhdGVXYXNtKCk7XG4gICAgICAgICAgY29uc3QgY29udGV4dCA9IG5ldyB3YXNtQ3J5cHRvLkRpZ2VzdENvbnRleHQobmFtZSk7XG4gICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBkYXRhIGFzIEFzeW5jSXRlcmFibGU8QnVmZmVyU291cmNlPikge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtCeXRlcyA9IGJ1ZmZlclNvdXJjZUJ5dGVzKGNodW5rKTtcbiAgICAgICAgICAgIGlmICghY2h1bmtCeXRlcykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZGF0YSBjb250YWluZWQgY2h1bmsgb2YgdGhlIHdyb25nIHR5cGVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250ZXh0LnVwZGF0ZShjaHVua0J5dGVzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNvbnRleHQuZGlnZXN0QW5kRHJvcChsZW5ndGgpLmJ1ZmZlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgXCJkYXRhIG11c3QgYmUgYSBCdWZmZXJTb3VyY2Ugb3IgW0FzeW5jXUl0ZXJhYmxlPEJ1ZmZlclNvdXJjZT5cIixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHdlYkNyeXB0by5zdWJ0bGU/LmRpZ2VzdCkge1xuICAgICAgICAvLyAoVHlwZVNjcmlwdCB0eXBlIGRlZmluaXRpb25zIHByb2hpYml0IHRoaXMgY2FzZS4pIElmIHRoZXkncmUgdHJ5aW5nXG4gICAgICAgIC8vIHRvIGNhbGwgYW4gYWxnb3JpdGhtIHdlIGRvbid0IHJlY29nbml6ZSwgcGFzcyBpdCBhbG9uZyB0byBXZWJDcnlwdG9cbiAgICAgICAgLy8gaW4gY2FzZSBpdCdzIGEgbm9uLXN0YW5kYXJkIGFsZ29yaXRobSBzdXBwb3J0ZWQgYnkgdGhlIHRoZSBydW50aW1lXG4gICAgICAgIC8vIHRoZXkncmUgdXNpbmcuXG4gICAgICAgIHJldHVybiB3ZWJDcnlwdG8uc3VidGxlLmRpZ2VzdChcbiAgICAgICAgICBhbGdvcml0aG0sXG4gICAgICAgICAgKGRhdGEgYXMgdW5rbm93bikgYXMgVWludDhBcnJheSxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYHVuc3VwcG9ydGVkIGRpZ2VzdCBhbGdvcml0aG06ICR7YWxnb3JpdGhtfWApO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBkaWdlc3RTeW5jKFxuICAgICAgYWxnb3JpdGhtOiBEaWdlc3RBbGdvcml0aG0sXG4gICAgICBkYXRhOiBCdWZmZXJTb3VyY2UgfCBJdGVyYWJsZTxCdWZmZXJTb3VyY2U+LFxuICAgICk6IEFycmF5QnVmZmVyIHtcbiAgICAgIGFsZ29yaXRobSA9IG5vcm1hbGl6ZUFsZ29yaXRobShhbGdvcml0aG0pO1xuXG4gICAgICBjb25zdCBieXRlcyA9IGJ1ZmZlclNvdXJjZUJ5dGVzKGRhdGEpO1xuXG4gICAgICBpZiAoRk5WQWxnb3JpdGhtcy5pbmNsdWRlcyhhbGdvcml0aG0ubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGZudihhbGdvcml0aG0ubmFtZSwgYnl0ZXMpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB3YXNtQ3J5cHRvID0gaW5zdGFudGlhdGVXYXNtKCk7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgcmV0dXJuIHdhc21DcnlwdG8uZGlnZXN0KGFsZ29yaXRobS5uYW1lLCBieXRlcywgYWxnb3JpdGhtLmxlbmd0aClcbiAgICAgICAgICAuYnVmZmVyO1xuICAgICAgfSBlbHNlIGlmICgoZGF0YSBhcyBJdGVyYWJsZTxCdWZmZXJTb3VyY2U+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgd2FzbUNyeXB0by5EaWdlc3RDb250ZXh0KGFsZ29yaXRobS5uYW1lKTtcbiAgICAgICAgZm9yIChjb25zdCBjaHVuayBvZiBkYXRhIGFzIEl0ZXJhYmxlPEJ1ZmZlclNvdXJjZT4pIHtcbiAgICAgICAgICBjb25zdCBjaHVua0J5dGVzID0gYnVmZmVyU291cmNlQnl0ZXMoY2h1bmspO1xuICAgICAgICAgIGlmICghY2h1bmtCeXRlcykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImRhdGEgY29udGFpbmVkIGNodW5rIG9mIHRoZSB3cm9uZyB0eXBlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250ZXh0LnVwZGF0ZShjaHVua0J5dGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5kaWdlc3RBbmREcm9wKGFsZ29yaXRobS5sZW5ndGgpLmJ1ZmZlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJkYXRhIG11c3QgYmUgYSBCdWZmZXJTb3VyY2Ugb3IgSXRlcmFibGU8QnVmZmVyU291cmNlPlwiLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBUT0RPKEBraXRzb25rKTogcmV3b3JrIHdoZW4gaHR0cHM6Ly9naXRodWIuY29tL3czYy93ZWJjcnlwdG8vaXNzdWVzLzI3MCByZXNvbHZlZFxuICAgIHRpbWluZ1NhZmVFcXVhbCxcbiAgfSxcbn0pO1xuXG5jb25zdCBGTlZBbGdvcml0aG1zID0gW1wiRk5WMzJcIiwgXCJGTlYzMkFcIiwgXCJGTlY2NFwiLCBcIkZOVjY0QVwiXTtcblxuLyoqIERpZ2VzdCBhbGdvcml0aG1zIHN1cHBvcnRlZCBieSBXZWJDcnlwdG8uICovXG5jb25zdCB3ZWJDcnlwdG9EaWdlc3RBbGdvcml0aG1zID0gW1xuICBcIlNIQS0zODRcIixcbiAgXCJTSEEtMjU2XCIsXG4gIFwiU0hBLTUxMlwiLFxuICAvLyBpbnNlY3VyZSAobGVuZ3RoLWV4dGVuZGFibGUgYW5kIGNvbGxpZGFibGUpOlxuICBcIlNIQS0xXCIsXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBGTlZBbGdvcml0aG1zID0gXCJGTlYzMlwiIHwgXCJGTlYzMkFcIiB8IFwiRk5WNjRcIiB8IFwiRk5WNjRBXCI7XG5leHBvcnQgdHlwZSBEaWdlc3RBbGdvcml0aG1OYW1lID0gV2FzbURpZ2VzdEFsZ29yaXRobSB8IEZOVkFsZ29yaXRobXM7XG5cbmV4cG9ydCB0eXBlIERpZ2VzdEFsZ29yaXRobU9iamVjdCA9IHtcbiAgbmFtZTogRGlnZXN0QWxnb3JpdGhtTmFtZTtcbiAgbGVuZ3RoPzogbnVtYmVyO1xufTtcblxuZXhwb3J0IHR5cGUgRGlnZXN0QWxnb3JpdGhtID0gRGlnZXN0QWxnb3JpdGhtTmFtZSB8IERpZ2VzdEFsZ29yaXRobU9iamVjdDtcblxuY29uc3Qgbm9ybWFsaXplQWxnb3JpdGhtID0gKGFsZ29yaXRobTogRGlnZXN0QWxnb3JpdGhtKSA9PlxuICAoKHR5cGVvZiBhbGdvcml0aG0gPT09IFwic3RyaW5nXCIpID8geyBuYW1lOiBhbGdvcml0aG0udG9VcHBlckNhc2UoKSB9IDoge1xuICAgIC4uLmFsZ29yaXRobSxcbiAgICBuYW1lOiBhbGdvcml0aG0ubmFtZS50b1VwcGVyQ2FzZSgpLFxuICB9KSBhcyBEaWdlc3RBbGdvcml0aG1PYmplY3Q7XG5cbmV4cG9ydCB7IHN0ZENyeXB0byBhcyBjcnlwdG8gfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXVLQyxHQUVELFNBRUUsZ0JBQWdCLElBQUksb0JBQW9CLEVBQ3hDLGVBQWUsUUFDVixnQkFBZ0IsQ0FBQztBQUN4QixTQUFTLGVBQWUsUUFBUSx3QkFBd0IsQ0FBQztBQUN6RCxTQUFTLEdBQUcsUUFBUSxlQUFlLENBQUM7QUFFcEM7OztDQUdDLEdBQ0QsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBSyxDQUFDO1FBQzlCLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDckQsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQyxNQUFNLEVBQUU7WUFDTixPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDcEQsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFN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