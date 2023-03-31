// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
import { crypto } from "./mod.ts";
const encoder = new TextEncoder();
/**
 * Creates a hash from a string or binary data, taking care of the boilerplate required for most cases.
 *
 * @example <caption>Before:</caption>
 * ```ts
 * import { crypto } from "https://deno.land/std@$STD_VERSION/crypto/crypto.ts";
 *
 * const encoder = new TextEncoder();
 *
 * const hash = await crypto.subtle.digest("SHA-1", encoder.encode("Hello, world!"));
 * ```
 *
 * @example <caption>After:</caption>
 * ```ts
 * import { createHash } from "https://deno.land/std@$STD_VERSION/crypto/_util.ts";
 *
 * const hash = await createHash("SHA-1", "Hello, world!");
 * ```
 * @private
 */ export async function createHash(algorithm, data) {
    if (typeof data === "string") {
        data = encoder.encode(data);
    }
    return await crypto.subtle.digest(algorithm, data);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2NyeXB0by9fdXRpbC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgY3J5cHRvLCB0eXBlIERpZ2VzdEFsZ29yaXRobSB9IGZyb20gXCIuL21vZC50c1wiO1xuXG5jb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGhhc2ggZnJvbSBhIHN0cmluZyBvciBiaW5hcnkgZGF0YSwgdGFraW5nIGNhcmUgb2YgdGhlIGJvaWxlcnBsYXRlIHJlcXVpcmVkIGZvciBtb3N0IGNhc2VzLlxuICpcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkJlZm9yZTo8L2NhcHRpb24+XG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY3J5cHRvIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vY3J5cHRvL2NyeXB0by50c1wiO1xuICpcbiAqIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAqXG4gKiBjb25zdCBoYXNoID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMVwiLCBlbmNvZGVyLmVuY29kZShcIkhlbGxvLCB3b3JsZCFcIikpO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGUgPGNhcHRpb24+QWZ0ZXI6PC9jYXB0aW9uPlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9jcnlwdG8vX3V0aWwudHNcIjtcbiAqXG4gKiBjb25zdCBoYXNoID0gYXdhaXQgY3JlYXRlSGFzaChcIlNIQS0xXCIsIFwiSGVsbG8sIHdvcmxkIVwiKTtcbiAqIGBgYFxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUhhc2goXG4gIGFsZ29yaXRobTogRGlnZXN0QWxnb3JpdGhtLFxuICBkYXRhOlxuICAgIHwgc3RyaW5nXG4gICAgfCBCdWZmZXJTb3VyY2VcbiAgICB8IEFzeW5jSXRlcmFibGU8QnVmZmVyU291cmNlPlxuICAgIHwgSXRlcmFibGU8QnVmZmVyU291cmNlPixcbik6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgZGF0YSA9IGVuY29kZXIuZW5jb2RlKGRhdGEpO1xuICB9XG4gIHJldHVybiBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChhbGdvcml0aG0sIGRhdGEpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxTQUFTLE1BQU0sUUFBOEIsVUFBVSxDQUFDO0FBRXhELE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLEFBQUM7QUFFbEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FtQkMsR0FDRCxPQUFPLGVBQWUsVUFBVSxDQUM5QixTQUEwQixFQUMxQixJQUkwQixFQUNKO0lBQ3RCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFDRCxPQUFPLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUMifQ==