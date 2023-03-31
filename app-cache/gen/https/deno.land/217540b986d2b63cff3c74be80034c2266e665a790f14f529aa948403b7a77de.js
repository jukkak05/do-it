// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { consumeMediaParam, decode2331Encoding } from "./_util.ts";
/**
 * Parses the media type and any optional parameters, per
 * [RFC 1521](https://datatracker.ietf.org/doc/html/rfc1521). Media types are
 * the values in `Content-Type` and `Content-Disposition` headers. On success
 * the function returns a tuple where the first element is the media type and
 * the second element is the optional parameters or `undefined` if there are
 * none.
 *
 * The function will throw if the parsed value is invalid.
 *
 * The returned media type will be normalized to be lower case, and returned
 * params keys will be normalized to lower case, but preserves the casing of
 * the value.
 *
 * @example
 * ```ts
 * import { parseMediaType } from "https://deno.land/std@$STD_VERSION/media_types/parse_media_type.ts";
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertEquals(
 *   parseMediaType("application/JSON"),
 *   [
 *     "application/json",
 *     undefined
 *   ]
 * );
 *
 * assertEquals(
 *   parseMediaType("text/html; charset=UTF-8"),
 *   [
 *     "application/json",
 *     { charset: "UTF-8" },
 *   ]
 * );
 * ```
 */ export function parseMediaType(v) {
    const [base] = v.split(";");
    const mediaType = base.toLowerCase().trim();
    const params = {};
    // Map of base parameter name -> parameter name -> value
    // for parameters containing a '*' character.
    const continuation = new Map();
    v = v.slice(base.length);
    while(v.length){
        v = v.trimStart();
        if (v.length === 0) {
            break;
        }
        const [key, value, rest] = consumeMediaParam(v);
        if (!key) {
            if (rest.trim() === ";") {
                break;
            }
            throw new TypeError("Invalid media parameter.");
        }
        let pmap = params;
        const [baseName, rest2] = key.split("*");
        if (baseName && rest2 != null) {
            if (!continuation.has(baseName)) {
                continuation.set(baseName, {});
            }
            pmap = continuation.get(baseName);
        }
        if (key in pmap) {
            throw new TypeError("Duplicate key parsed.");
        }
        pmap[key] = value;
        v = rest;
    }
    // Stitch together any continuations or things with stars
    // (i.e. RFC 2231 things with stars: "foo*0" or "foo*")
    let str = "";
    for (const [key1, pieceMap] of continuation){
        const singlePartKey = `${key1}*`;
        const v1 = pieceMap[singlePartKey];
        if (v1) {
            const decv = decode2331Encoding(v1);
            if (decv) {
                params[key1] = decv;
            }
            continue;
        }
        str = "";
        let valid = false;
        for(let n = 0;; n++){
            const simplePart = `${key1}*${n}`;
            let v2 = pieceMap[simplePart];
            if (v2) {
                valid = true;
                str += v2;
                continue;
            }
            const encodedPart = `${simplePart}*`;
            v2 = pieceMap[encodedPart];
            if (!v2) {
                break;
            }
            valid = true;
            if (n === 0) {
                const decv1 = decode2331Encoding(v2);
                if (decv1) {
                    str += decv1;
                }
            } else {
                const decv2 = decodeURI(v2);
                str += decv2;
            }
        }
        if (valid) {
            params[key1] = str;
        }
    }
    return Object.keys(params).length ? [
        mediaType,
        params
    ] : [
        mediaType,
        undefined
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL21lZGlhX3R5cGVzL3BhcnNlX21lZGlhX3R5cGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgY29uc3VtZU1lZGlhUGFyYW0sIGRlY29kZTIzMzFFbmNvZGluZyB9IGZyb20gXCIuL191dGlsLnRzXCI7XG5cbi8qKlxuICogUGFyc2VzIHRoZSBtZWRpYSB0eXBlIGFuZCBhbnkgb3B0aW9uYWwgcGFyYW1ldGVycywgcGVyXG4gKiBbUkZDIDE1MjFdKGh0dHBzOi8vZGF0YXRyYWNrZXIuaWV0Zi5vcmcvZG9jL2h0bWwvcmZjMTUyMSkuIE1lZGlhIHR5cGVzIGFyZVxuICogdGhlIHZhbHVlcyBpbiBgQ29udGVudC1UeXBlYCBhbmQgYENvbnRlbnQtRGlzcG9zaXRpb25gIGhlYWRlcnMuIE9uIHN1Y2Nlc3NcbiAqIHRoZSBmdW5jdGlvbiByZXR1cm5zIGEgdHVwbGUgd2hlcmUgdGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlIG1lZGlhIHR5cGUgYW5kXG4gKiB0aGUgc2Vjb25kIGVsZW1lbnQgaXMgdGhlIG9wdGlvbmFsIHBhcmFtZXRlcnMgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlXG4gKiBub25lLlxuICpcbiAqIFRoZSBmdW5jdGlvbiB3aWxsIHRocm93IGlmIHRoZSBwYXJzZWQgdmFsdWUgaXMgaW52YWxpZC5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgbWVkaWEgdHlwZSB3aWxsIGJlIG5vcm1hbGl6ZWQgdG8gYmUgbG93ZXIgY2FzZSwgYW5kIHJldHVybmVkXG4gKiBwYXJhbXMga2V5cyB3aWxsIGJlIG5vcm1hbGl6ZWQgdG8gbG93ZXIgY2FzZSwgYnV0IHByZXNlcnZlcyB0aGUgY2FzaW5nIG9mXG4gKiB0aGUgdmFsdWUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwYXJzZU1lZGlhVHlwZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL21lZGlhX3R5cGVzL3BhcnNlX21lZGlhX3R5cGUudHNcIjtcbiAqIGltcG9ydCB7IGFzc2VydEVxdWFscyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL3Rlc3RpbmcvYXNzZXJ0cy50c1wiO1xuICpcbiAqIGFzc2VydEVxdWFscyhcbiAqICAgcGFyc2VNZWRpYVR5cGUoXCJhcHBsaWNhdGlvbi9KU09OXCIpLFxuICogICBbXG4gKiAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gKiAgICAgdW5kZWZpbmVkXG4gKiAgIF1cbiAqICk7XG4gKlxuICogYXNzZXJ0RXF1YWxzKFxuICogICBwYXJzZU1lZGlhVHlwZShcInRleHQvaHRtbDsgY2hhcnNldD1VVEYtOFwiKSxcbiAqICAgW1xuICogICAgIFwiYXBwbGljYXRpb24vanNvblwiLFxuICogICAgIHsgY2hhcnNldDogXCJVVEYtOFwiIH0sXG4gKiAgIF1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWVkaWFUeXBlKFxuICB2OiBzdHJpbmcsXG4pOiBbbWVkaWFUeXBlOiBzdHJpbmcsIHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHVuZGVmaW5lZF0ge1xuICBjb25zdCBbYmFzZV0gPSB2LnNwbGl0KFwiO1wiKTtcbiAgY29uc3QgbWVkaWFUeXBlID0gYmFzZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICBjb25zdCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgLy8gTWFwIG9mIGJhc2UgcGFyYW1ldGVyIG5hbWUgLT4gcGFyYW1ldGVyIG5hbWUgLT4gdmFsdWVcbiAgLy8gZm9yIHBhcmFtZXRlcnMgY29udGFpbmluZyBhICcqJyBjaGFyYWN0ZXIuXG4gIGNvbnN0IGNvbnRpbnVhdGlvbiA9IG5ldyBNYXA8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigpO1xuXG4gIHYgPSB2LnNsaWNlKGJhc2UubGVuZ3RoKTtcbiAgd2hpbGUgKHYubGVuZ3RoKSB7XG4gICAgdiA9IHYudHJpbVN0YXJ0KCk7XG4gICAgaWYgKHYubGVuZ3RoID09PSAwKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgW2tleSwgdmFsdWUsIHJlc3RdID0gY29uc3VtZU1lZGlhUGFyYW0odik7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIGlmIChyZXN0LnRyaW0oKSA9PT0gXCI7XCIpIHtcbiAgICAgICAgLy8gaWdub3JlIHRyYWlsaW5nIHNlbWljb2xvbnNcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBtZWRpYSBwYXJhbWV0ZXIuXCIpO1xuICAgIH1cblxuICAgIGxldCBwbWFwID0gcGFyYW1zO1xuICAgIGNvbnN0IFtiYXNlTmFtZSwgcmVzdDJdID0ga2V5LnNwbGl0KFwiKlwiKTtcbiAgICBpZiAoYmFzZU5hbWUgJiYgcmVzdDIgIT0gbnVsbCkge1xuICAgICAgaWYgKCFjb250aW51YXRpb24uaGFzKGJhc2VOYW1lKSkge1xuICAgICAgICBjb250aW51YXRpb24uc2V0KGJhc2VOYW1lLCB7fSk7XG4gICAgICB9XG4gICAgICBwbWFwID0gY29udGludWF0aW9uLmdldChiYXNlTmFtZSkhO1xuICAgIH1cbiAgICBpZiAoa2V5IGluIHBtYXApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJEdXBsaWNhdGUga2V5IHBhcnNlZC5cIik7XG4gICAgfVxuICAgIHBtYXBba2V5XSA9IHZhbHVlO1xuICAgIHYgPSByZXN0O1xuICB9XG5cbiAgLy8gU3RpdGNoIHRvZ2V0aGVyIGFueSBjb250aW51YXRpb25zIG9yIHRoaW5ncyB3aXRoIHN0YXJzXG4gIC8vIChpLmUuIFJGQyAyMjMxIHRoaW5ncyB3aXRoIHN0YXJzOiBcImZvbyowXCIgb3IgXCJmb28qXCIpXG4gIGxldCBzdHIgPSBcIlwiO1xuICBmb3IgKGNvbnN0IFtrZXksIHBpZWNlTWFwXSBvZiBjb250aW51YXRpb24pIHtcbiAgICBjb25zdCBzaW5nbGVQYXJ0S2V5ID0gYCR7a2V5fSpgO1xuICAgIGNvbnN0IHYgPSBwaWVjZU1hcFtzaW5nbGVQYXJ0S2V5XTtcbiAgICBpZiAodikge1xuICAgICAgY29uc3QgZGVjdiA9IGRlY29kZTIzMzFFbmNvZGluZyh2KTtcbiAgICAgIGlmIChkZWN2KSB7XG4gICAgICAgIHBhcmFtc1trZXldID0gZGVjdjtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHN0ciA9IFwiXCI7XG4gICAgbGV0IHZhbGlkID0gZmFsc2U7XG4gICAgZm9yIChsZXQgbiA9IDA7OyBuKyspIHtcbiAgICAgIGNvbnN0IHNpbXBsZVBhcnQgPSBgJHtrZXl9KiR7bn1gO1xuICAgICAgbGV0IHYgPSBwaWVjZU1hcFtzaW1wbGVQYXJ0XTtcbiAgICAgIGlmICh2KSB7XG4gICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgc3RyICs9IHY7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW5jb2RlZFBhcnQgPSBgJHtzaW1wbGVQYXJ0fSpgO1xuICAgICAgdiA9IHBpZWNlTWFwW2VuY29kZWRQYXJ0XTtcbiAgICAgIGlmICghdikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgIGNvbnN0IGRlY3YgPSBkZWNvZGUyMzMxRW5jb2Rpbmcodik7XG4gICAgICAgIGlmIChkZWN2KSB7XG4gICAgICAgICAgc3RyICs9IGRlY3Y7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGRlY3YgPSBkZWNvZGVVUkkodik7XG4gICAgICAgIHN0ciArPSBkZWN2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodmFsaWQpIHtcbiAgICAgIHBhcmFtc1trZXldID0gc3RyO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLmxlbmd0aFxuICAgID8gW21lZGlhVHlwZSwgcGFyYW1zXVxuICAgIDogW21lZGlhVHlwZSwgdW5kZWZpbmVkXTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDLFNBQVMsaUJBQWlCLEVBQUUsa0JBQWtCLFFBQVEsWUFBWSxDQUFDO0FBRW5FOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1DQyxHQUNELE9BQU8sU0FBUyxjQUFjLENBQzVCLENBQVMsRUFDd0Q7SUFDakUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEFBQUM7SUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxBQUFDO0lBRTVDLE1BQU0sTUFBTSxHQUEyQixFQUFFLEFBQUM7SUFDMUMsd0RBQXdEO0lBQ3hELDZDQUE2QztJQUM3QyxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0MsQUFBQztJQUUvRCxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsTUFBTyxDQUFDLENBQUMsTUFBTSxDQUFFO1FBQ2YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ2xCLE1BQU07UUFDUixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEFBQUM7UUFDaEQsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNSLElBQUks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