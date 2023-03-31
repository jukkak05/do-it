// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { encode as hexEncode } from "../encoding/hex.ts";
import { encode as base64Encode } from "../encoding/base64.ts";
const decoder = new TextDecoder();
/**
 * Converts a hash to a string with a given encoding.
 * @example
 * ```ts
 * import { crypto } from "https://deno.land/std@$STD_VERSION/crypto/crypto.ts";
 * import { toHashString } from "https://deno.land/std@$STD_VERSION/crypto/to_hash_string.ts"
 *
 * const hash = await crypto.subtle.digest("SHA-384", new TextEncoder().encode("You hear that Mr. Anderson?"));
 *
 * // Hex encoding by default
 * console.log(toHashString(hash));
 *
 * // Or with base64 encoding
 * console.log(toHashString(hash, "base64"));
 * ```
 */ export function toHashString(hash, encoding = "hex") {
    switch(encoding){
        case "hex":
            return decoder.decode(hexEncode(new Uint8Array(hash)));
        case "base64":
            return base64Encode(hash);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2NyeXB0by90b19oYXNoX3N0cmluZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBlbmNvZGUgYXMgaGV4RW5jb2RlIH0gZnJvbSBcIi4uL2VuY29kaW5nL2hleC50c1wiO1xuaW1wb3J0IHsgZW5jb2RlIGFzIGJhc2U2NEVuY29kZSB9IGZyb20gXCIuLi9lbmNvZGluZy9iYXNlNjQudHNcIjtcblxuY29uc3QgZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xuXG4vKipcbiAqIENvbnZlcnRzIGEgaGFzaCB0byBhIHN0cmluZyB3aXRoIGEgZ2l2ZW4gZW5jb2RpbmcuXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNyeXB0byB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2NyeXB0by9jcnlwdG8udHNcIjtcbiAqIGltcG9ydCB7IHRvSGFzaFN0cmluZyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2NyeXB0by90b19oYXNoX3N0cmluZy50c1wiXG4gKlxuICogY29uc3QgaGFzaCA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFwiU0hBLTM4NFwiLCBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJZb3UgaGVhciB0aGF0IE1yLiBBbmRlcnNvbj9cIikpO1xuICpcbiAqIC8vIEhleCBlbmNvZGluZyBieSBkZWZhdWx0XG4gKiBjb25zb2xlLmxvZyh0b0hhc2hTdHJpbmcoaGFzaCkpO1xuICpcbiAqIC8vIE9yIHdpdGggYmFzZTY0IGVuY29kaW5nXG4gKiBjb25zb2xlLmxvZyh0b0hhc2hTdHJpbmcoaGFzaCwgXCJiYXNlNjRcIikpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hhc2hTdHJpbmcoXG4gIGhhc2g6IEFycmF5QnVmZmVyLFxuICBlbmNvZGluZzogXCJoZXhcIiB8IFwiYmFzZTY0XCIgPSBcImhleFwiLFxuKTogc3RyaW5nIHtcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgXCJoZXhcIjpcbiAgICAgIHJldHVybiBkZWNvZGVyLmRlY29kZShoZXhFbmNvZGUobmV3IFVpbnQ4QXJyYXkoaGFzaCkpKTtcbiAgICBjYXNlIFwiYmFzZTY0XCI6XG4gICAgICByZXR1cm4gYmFzZTY0RW5jb2RlKGhhc2gpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHFDQUFxQztBQUVyQyxTQUFTLE1BQU0sSUFBSSxTQUFTLFFBQVEsb0JBQW9CLENBQUM7QUFDekQsU0FBUyxNQUFNLElBQUksWUFBWSxRQUFRLHVCQUF1QixDQUFDO0FBRS9ELE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLEFBQUM7QUFFbEM7Ozs7Ozs7Ozs7Ozs7OztDQWVDLEdBQ0QsT0FBTyxTQUFTLFlBQVksQ0FDMUIsSUFBaUIsRUFDakIsUUFBMEIsR0FBRyxLQUFLLEVBQzFCO0lBQ1IsT0FBUSxRQUFRO1FBQ2QsS0FBSyxLQUFLO1lBQ1IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsS0FBSyxRQUFRO1lBQ1gsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDN0I7QUFDSCxDQUFDIn0=