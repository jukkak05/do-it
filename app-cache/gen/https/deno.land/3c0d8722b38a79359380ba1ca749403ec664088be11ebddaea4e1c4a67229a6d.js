// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// Structured similarly to Go's cookie.go
// https://github.com/golang/go/blob/master/src/net/http/cookie.go
// This module is browser compatible.
import { assert } from "../_util/asserts.ts";
import { toIMF } from "../datetime/to_imf.ts";
const FIELD_CONTENT_REGEXP = /^(?=[\x20-\x7E]*$)[^()@<>,;:\\"\[\]?={}\s]+$/;
function toString(cookie) {
    if (!cookie.name) {
        return "";
    }
    const out = [];
    validateName(cookie.name);
    validateValue(cookie.name, cookie.value);
    out.push(`${cookie.name}=${cookie.value}`);
    // Fallback for invalid Set-Cookie
    // ref: https://tools.ietf.org/html/draft-ietf-httpbis-cookie-prefixes-00#section-3.1
    if (cookie.name.startsWith("__Secure")) {
        cookie.secure = true;
    }
    if (cookie.name.startsWith("__Host")) {
        cookie.path = "/";
        cookie.secure = true;
        delete cookie.domain;
    }
    if (cookie.secure) {
        out.push("Secure");
    }
    if (cookie.httpOnly) {
        out.push("HttpOnly");
    }
    if (typeof cookie.maxAge === "number" && Number.isInteger(cookie.maxAge)) {
        assert(cookie.maxAge >= 0, "Max-Age must be an integer superior or equal to 0");
        out.push(`Max-Age=${cookie.maxAge}`);
    }
    if (cookie.domain) {
        validateDomain(cookie.domain);
        out.push(`Domain=${cookie.domain}`);
    }
    if (cookie.sameSite) {
        out.push(`SameSite=${cookie.sameSite}`);
    }
    if (cookie.path) {
        validatePath(cookie.path);
        out.push(`Path=${cookie.path}`);
    }
    if (cookie.expires) {
        const { expires  } = cookie;
        const dateString = toIMF(typeof expires === "number" ? new Date(expires) : expires);
        out.push(`Expires=${dateString}`);
    }
    if (cookie.unparsed) {
        out.push(cookie.unparsed.join("; "));
    }
    return out.join("; ");
}
/**
 * Validate Cookie Name.
 * @param name Cookie name.
 */ function validateName(name) {
    if (name && !FIELD_CONTENT_REGEXP.test(name)) {
        throw new TypeError(`Invalid cookie name: "${name}".`);
    }
}
/**
 * Validate Path Value.
 * See {@link https://tools.ietf.org/html/rfc6265#section-4.1.2.4}.
 * @param path Path value.
 */ function validatePath(path) {
    if (path == null) {
        return;
    }
    for(let i = 0; i < path.length; i++){
        const c = path.charAt(i);
        if (c < String.fromCharCode(0x20) || c > String.fromCharCode(0x7E) || c == ";") {
            throw new Error(path + ": Invalid cookie path char '" + c + "'");
        }
    }
}
/**
 * Validate Cookie Value.
 * See {@link https://tools.ietf.org/html/rfc6265#section-4.1}.
 * @param value Cookie value.
 */ function validateValue(name, value) {
    if (value == null || name == null) return;
    for(let i = 0; i < value.length; i++){
        const c = value.charAt(i);
        if (c < String.fromCharCode(0x21) || c == String.fromCharCode(0x22) || c == String.fromCharCode(0x2c) || c == String.fromCharCode(0x3b) || c == String.fromCharCode(0x5c) || c == String.fromCharCode(0x7f)) {
            throw new Error("RFC2616 cookie '" + name + "' cannot contain character '" + c + "'");
        }
        if (c > String.fromCharCode(0x80)) {
            throw new Error("RFC2616 cookie '" + name + "' can only have US-ASCII chars as value" + c.charCodeAt(0).toString(16));
        }
    }
}
/**
 * Validate Cookie Domain.
 * See {@link https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.2.3}.
 * @param domain Cookie domain.
 */ function validateDomain(domain) {
    if (domain == null) {
        return;
    }
    const char1 = domain.charAt(0);
    const charN = domain.charAt(domain.length - 1);
    if (char1 == "-" || charN == "." || charN == "-") {
        throw new Error("Invalid first/last char in cookie domain: " + domain);
    }
}
/**
 * Parse cookies of a header
 *
 * @example
 * ```ts
 * import { getCookies } from "https://deno.land/std@$STD_VERSION/http/cookie.ts";
 *
 * const headers = new Headers();
 * headers.set("Cookie", "full=of; tasty=chocolate");
 *
 * const cookies = getCookies(headers);
 * console.log(cookies); // { full: "of", tasty: "chocolate" }
 * ```
 *
 * @param headers The headers instance to get cookies from
 * @return Object with cookie names as keys
 */ export function getCookies(headers) {
    const cookie = headers.get("Cookie");
    if (cookie != null) {
        const out = {};
        const c = cookie.split(";");
        for (const kv of c){
            const [cookieKey, ...cookieVal] = kv.split("=");
            assert(cookieKey != null);
            const key = cookieKey.trim();
            out[key] = cookieVal.join("=");
        }
        return out;
    }
    return {};
}
/**
 * Set the cookie header properly in the headers
 *
 * @example
 * ```ts
 * import {
 *   Cookie,
 *   setCookie,
 * } from "https://deno.land/std@$STD_VERSION/http/cookie.ts";
 *
 * const headers = new Headers();
 * const cookie: Cookie = { name: "Space", value: "Cat" };
 * setCookie(headers, cookie);
 *
 * const cookieHeader = headers.get("set-cookie");
 * console.log(cookieHeader); // Space=Cat
 * ```
 *
 * @param headers The headers instance to set the cookie to
 * @param cookie Cookie to set
 */ export function setCookie(headers, cookie) {
    // Parsing cookie headers to make consistent set-cookie header
    // ref: https://tools.ietf.org/html/rfc6265#section-4.1.1
    const v = toString(cookie);
    if (v) {
        headers.append("Set-Cookie", v);
    }
}
/**
 * Set the cookie header with empty value in the headers to delete it
 *
 * > Note: Deleting a `Cookie` will set its expiration date before now. Forcing
 * > the browser to delete it.
 *
 * @example
 * ```ts
 * import { deleteCookie } from "https://deno.land/std@$STD_VERSION/http/cookie.ts";
 *
 * const headers = new Headers();
 * deleteCookie(headers, "deno");
 *
 * const cookieHeader = headers.get("set-cookie");
 * console.log(cookieHeader); // deno=; Expires=Thus, 01 Jan 1970 00:00:00 GMT
 * ```
 *
 * @param headers The headers instance to delete the cookie from
 * @param name Name of cookie
 * @param attributes Additional cookie attributes
 */ export function deleteCookie(headers, name, attributes) {
    setCookie(headers, {
        name: name,
        value: "",
        expires: new Date(0),
        ...attributes
    });
}
function parseSetCookie(value) {
    const attrs = value.split(";").map((attr)=>{
        const [key, ...values] = attr.trim().split("=");
        return [
            key,
            values.join("=")
        ];
    });
    const cookie = {
        name: attrs[0][0],
        value: attrs[0][1]
    };
    for (const [key, value1] of attrs.slice(1)){
        switch(key.toLocaleLowerCase()){
            case "expires":
                cookie.expires = new Date(value1);
                break;
            case "max-age":
                cookie.maxAge = Number(value1);
                if (cookie.maxAge < 0) {
                    console.warn("Max-Age must be an integer superior or equal to 0. Cookie ignored.");
                    return null;
                }
                break;
            case "domain":
                cookie.domain = value1;
                break;
            case "path":
                cookie.path = value1;
                break;
            case "secure":
                cookie.secure = true;
                break;
            case "httponly":
                cookie.httpOnly = true;
                break;
            case "samesite":
                cookie.sameSite = value1;
                break;
            default:
                if (!Array.isArray(cookie.unparsed)) {
                    cookie.unparsed = [];
                }
                cookie.unparsed.push([
                    key,
                    value1
                ].join("="));
        }
    }
    if (cookie.name.startsWith("__Secure-")) {
        /** This requirement is mentioned in https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie but not the RFC. */ if (!cookie.secure) {
            console.warn("Cookies with names starting with `__Secure-` must be set with the secure flag. Cookie ignored.");
            return null;
        }
    }
    if (cookie.name.startsWith("__Host-")) {
        if (!cookie.secure) {
            console.warn("Cookies with names starting with `__Host-` must be set with the secure flag. Cookie ignored.");
            return null;
        }
        if (cookie.domain !== undefined) {
            console.warn("Cookies with names starting with `__Host-` must not have a domain specified. Cookie ignored.");
            return null;
        }
        if (cookie.path !== "/") {
            console.warn("Cookies with names starting with `__Host-` must have path be `/`. Cookie has been ignored.");
            return null;
        }
    }
    return cookie;
}
/**
 * Parse set-cookies of a header
 *
 * @example
 * ```ts
 * import { getSetCookies } from "https://deno.land/std@$STD_VERSION/http/cookie.ts";
 *
 * const headers = new Headers([
 *   ["Set-Cookie", "lulu=meow; Secure; Max-Age=3600"],
 *   ["Set-Cookie", "booya=kasha; HttpOnly; Path=/"],
 * ]);
 *
 * const cookies = getSetCookies(headers);
 * console.log(cookies); // [{ name: "lulu", value: "meow", secure: true, maxAge: 3600 }, { name: "booya", value: "kahsa", httpOnly: true, path: "/ }]
 * ```
 *
 * @param headers The headers instance to get set-cookies from
 * @return List of cookies
 */ export function getSetCookies(headers) {
    if (!headers.has("set-cookie")) {
        return [];
    }
    return [
        ...headers.entries()
    ].filter(([key])=>key === "set-cookie").map(([_, value])=>value)/** Parse each `set-cookie` header separately */ .map(parseSetCookie)/** Skip empty cookies */ .filter(Boolean);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvY29va2llLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjMgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBTdHJ1Y3R1cmVkIHNpbWlsYXJseSB0byBHbydzIGNvb2tpZS5nb1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvbGFuZy9nby9ibG9iL21hc3Rlci9zcmMvbmV0L2h0dHAvY29va2llLmdvXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnRzLnRzXCI7XG5pbXBvcnQgeyB0b0lNRiB9IGZyb20gXCIuLi9kYXRldGltZS90b19pbWYudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb29raWUge1xuICAvKiogTmFtZSBvZiB0aGUgY29va2llLiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBWYWx1ZSBvZiB0aGUgY29va2llLiAqL1xuICB2YWx1ZTogc3RyaW5nO1xuICAvKiogVGhlIGNvb2tpZSdzIGBFeHBpcmVzYCBhdHRyaWJ1dGUsIGVpdGhlciBhcyBhbiBleHBsaWNpdCBkYXRlIG9yIFVUQyBtaWxsaXNlY29uZHMuXG4gICAqIEBleGFtcGxlIDxjYXB0aW9uPkV4cGxpY2l0IGRhdGU6PC9jYXB0aW9uPlxuICAgKlxuICAgKiBgYGB0c1xuICAgKiBpbXBvcnQgeyBDb29raWUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2Nvb2tpZS50c1wiO1xuICAgKiBjb25zdCBjb29raWU6IENvb2tpZSA9IHtcbiAgICogICBuYW1lOiAnbmFtZScsXG4gICAqICAgdmFsdWU6ICd2YWx1ZScsXG4gICAqICAgLy8gZXhwaXJlcyBvbiBGcmkgRGVjIDMwIDIwMjJcbiAgICogICBleHBpcmVzOiBuZXcgRGF0ZSgnMjAyMi0xMi0zMScpXG4gICAqIH1cbiAgICogYGBgXG4gICAqXG4gICAqIEBleGFtcGxlIDxjYXB0aW9uPlVUQyBtaWxsaXNlY29uZHM8L2NhcHRpb24+XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IENvb2tpZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2h0dHAvY29va2llLnRzXCI7XG4gICAqIGNvbnN0IGNvb2tpZTogQ29va2llID0ge1xuICAgKiAgIG5hbWU6ICduYW1lJyxcbiAgICogICB2YWx1ZTogJ3ZhbHVlJyxcbiAgICogICAvLyBleHBpcmVzIDEwIHNlY29uZHMgZnJvbSBub3dcbiAgICogICBleHBpcmVzOiBEYXRlLm5vdygpICsgMTAwMDBcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGV4cGlyZXM/OiBEYXRlIHwgbnVtYmVyO1xuICAvKiogVGhlIGNvb2tpZSdzIGBNYXgtQWdlYCBhdHRyaWJ1dGUsIGluIHNlY29uZHMuIE11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlci4gQSBjb29raWUgd2l0aCBhIGBtYXhBZ2VgIG9mIGAwYCBleHBpcmVzIGltbWVkaWF0ZWx5LiAqL1xuICBtYXhBZ2U/OiBudW1iZXI7XG4gIC8qKiBUaGUgY29va2llJ3MgYERvbWFpbmAgYXR0cmlidXRlLiBTcGVjaWZpZXMgdGhvc2UgaG9zdHMgdG8gd2hpY2ggdGhlIGNvb2tpZSB3aWxsIGJlIHNlbnQuICovXG4gIGRvbWFpbj86IHN0cmluZztcbiAgLyoqIFRoZSBjb29raWUncyBgUGF0aGAgYXR0cmlidXRlLiBBIGNvb2tpZSB3aXRoIGEgcGF0aCB3aWxsIG9ubHkgYmUgaW5jbHVkZWQgaW4gdGhlIGBDb29raWVgIHJlcXVlc3QgaGVhZGVyIGlmIHRoZSByZXF1ZXN0ZWQgVVJMIG1hdGNoZXMgdGhhdCBwYXRoLiAqL1xuICBwYXRoPzogc3RyaW5nO1xuICAvKiogVGhlIGNvb2tpZSdzIGBTZWN1cmVgIGF0dHJpYnV0ZS4gSWYgYHRydWVgLCB0aGUgY29va2llIHdpbGwgb25seSBiZSBpbmNsdWRlZCBpbiB0aGUgYENvb2tpZWAgcmVxdWVzdCBoZWFkZXIgaWYgdGhlIGNvbm5lY3Rpb24gdXNlcyBTU0wgYW5kIEhUVFBTLiAqL1xuICBzZWN1cmU/OiBib29sZWFuO1xuICAvKiogVGhlIGNvb2tpZSdzIGBIVFRQT25seWAgYXR0cmlidXRlLiBJZiBgdHJ1ZWAsIHRoZSBjb29raWUgY2Fubm90IGJlIGFjY2Vzc2VkIHZpYSBKYXZhU2NyaXB0LiAqL1xuICBodHRwT25seT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvd3Mgc2VydmVycyB0byBhc3NlcnQgdGhhdCBhIGNvb2tpZSBvdWdodCBub3QgdG9cbiAgICogYmUgc2VudCBhbG9uZyB3aXRoIGNyb3NzLXNpdGUgcmVxdWVzdHMuXG4gICAqL1xuICBzYW1lU2l0ZT86IFwiU3RyaWN0XCIgfCBcIkxheFwiIHwgXCJOb25lXCI7XG4gIC8qKiBBZGRpdGlvbmFsIGtleSB2YWx1ZSBwYWlycyB3aXRoIHRoZSBmb3JtIFwia2V5PXZhbHVlXCIgKi9cbiAgdW5wYXJzZWQ/OiBzdHJpbmdbXTtcbn1cblxuY29uc3QgRklFTERfQ09OVEVOVF9SRUdFWFAgPSAvXig/PVtcXHgyMC1cXHg3RV0qJClbXigpQDw+LDs6XFxcXFwiXFxbXFxdPz17fVxcc10rJC87XG5cbmZ1bmN0aW9uIHRvU3RyaW5nKGNvb2tpZTogQ29va2llKTogc3RyaW5nIHtcbiAgaWYgKCFjb29raWUubmFtZSkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG4gIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgdmFsaWRhdGVOYW1lKGNvb2tpZS5uYW1lKTtcbiAgdmFsaWRhdGVWYWx1ZShjb29raWUubmFtZSwgY29va2llLnZhbHVlKTtcbiAgb3V0LnB1c2goYCR7Y29va2llLm5hbWV9PSR7Y29va2llLnZhbHVlfWApO1xuXG4gIC8vIEZhbGxiYWNrIGZvciBpbnZhbGlkIFNldC1Db29raWVcbiAgLy8gcmVmOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtaWV0Zi1odHRwYmlzLWNvb2tpZS1wcmVmaXhlcy0wMCNzZWN0aW9uLTMuMVxuICBpZiAoY29va2llLm5hbWUuc3RhcnRzV2l0aChcIl9fU2VjdXJlXCIpKSB7XG4gICAgY29va2llLnNlY3VyZSA9IHRydWU7XG4gIH1cbiAgaWYgKGNvb2tpZS5uYW1lLnN0YXJ0c1dpdGgoXCJfX0hvc3RcIikpIHtcbiAgICBjb29raWUucGF0aCA9IFwiL1wiO1xuICAgIGNvb2tpZS5zZWN1cmUgPSB0cnVlO1xuICAgIGRlbGV0ZSBjb29raWUuZG9tYWluO1xuICB9XG5cbiAgaWYgKGNvb2tpZS5zZWN1cmUpIHtcbiAgICBvdXQucHVzaChcIlNlY3VyZVwiKTtcbiAgfVxuICBpZiAoY29va2llLmh0dHBPbmx5KSB7XG4gICAgb3V0LnB1c2goXCJIdHRwT25seVwiKTtcbiAgfVxuICBpZiAodHlwZW9mIGNvb2tpZS5tYXhBZ2UgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzSW50ZWdlcihjb29raWUubWF4QWdlKSkge1xuICAgIGFzc2VydChcbiAgICAgIGNvb2tpZS5tYXhBZ2UgPj0gMCxcbiAgICAgIFwiTWF4LUFnZSBtdXN0IGJlIGFuIGludGVnZXIgc3VwZXJpb3Igb3IgZXF1YWwgdG8gMFwiLFxuICAgICk7XG4gICAgb3V0LnB1c2goYE1heC1BZ2U9JHtjb29raWUubWF4QWdlfWApO1xuICB9XG4gIGlmIChjb29raWUuZG9tYWluKSB7XG4gICAgdmFsaWRhdGVEb21haW4oY29va2llLmRvbWFpbik7XG4gICAgb3V0LnB1c2goYERvbWFpbj0ke2Nvb2tpZS5kb21haW59YCk7XG4gIH1cbiAgaWYgKGNvb2tpZS5zYW1lU2l0ZSkge1xuICAgIG91dC5wdXNoKGBTYW1lU2l0ZT0ke2Nvb2tpZS5zYW1lU2l0ZX1gKTtcbiAgfVxuICBpZiAoY29va2llLnBhdGgpIHtcbiAgICB2YWxpZGF0ZVBhdGgoY29va2llLnBhdGgpO1xuICAgIG91dC5wdXNoKGBQYXRoPSR7Y29va2llLnBhdGh9YCk7XG4gIH1cbiAgaWYgKGNvb2tpZS5leHBpcmVzKSB7XG4gICAgY29uc3QgeyBleHBpcmVzIH0gPSBjb29raWU7XG4gICAgY29uc3QgZGF0ZVN0cmluZyA9IHRvSU1GKFxuICAgICAgdHlwZW9mIGV4cGlyZXMgPT09IFwibnVtYmVyXCIgPyBuZXcgRGF0ZShleHBpcmVzKSA6IGV4cGlyZXMsXG4gICAgKTtcbiAgICBvdXQucHVzaChgRXhwaXJlcz0ke2RhdGVTdHJpbmd9YCk7XG4gIH1cbiAgaWYgKGNvb2tpZS51bnBhcnNlZCkge1xuICAgIG91dC5wdXNoKGNvb2tpZS51bnBhcnNlZC5qb2luKFwiOyBcIikpO1xuICB9XG4gIHJldHVybiBvdXQuam9pbihcIjsgXCIpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIENvb2tpZSBOYW1lLlxuICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWUuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlTmFtZShuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gIGlmIChuYW1lICYmICFGSUVMRF9DT05URU5UX1JFR0VYUC50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCBjb29raWUgbmFtZTogXCIke25hbWV9XCIuYCk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBQYXRoIFZhbHVlLlxuICogU2VlIHtAbGluayBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjI2NSNzZWN0aW9uLTQuMS4yLjR9LlxuICogQHBhcmFtIHBhdGggUGF0aCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVQYXRoKHBhdGg6IHN0cmluZyB8IG51bGwpIHtcbiAgaWYgKHBhdGggPT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjID0gcGF0aC5jaGFyQXQoaSk7XG4gICAgaWYgKFxuICAgICAgYyA8IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgyMCkgfHwgYyA+IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg3RSkgfHwgYyA9PSBcIjtcIlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBwYXRoICsgXCI6IEludmFsaWQgY29va2llIHBhdGggY2hhciAnXCIgKyBjICsgXCInXCIsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlIENvb2tpZSBWYWx1ZS5cbiAqIFNlZSB7QGxpbmsgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzYyNjUjc2VjdGlvbi00LjF9LlxuICogQHBhcmFtIHZhbHVlIENvb2tpZSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVWYWx1ZShuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudWxsKSB7XG4gIGlmICh2YWx1ZSA9PSBudWxsIHx8IG5hbWUgPT0gbnVsbCkgcmV0dXJuO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYyA9IHZhbHVlLmNoYXJBdChpKTtcbiAgICBpZiAoXG4gICAgICBjIDwgU3RyaW5nLmZyb21DaGFyQ29kZSgweDIxKSB8fCBjID09IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgyMikgfHxcbiAgICAgIGMgPT0gU3RyaW5nLmZyb21DaGFyQ29kZSgweDJjKSB8fCBjID09IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgzYikgfHxcbiAgICAgIGMgPT0gU3RyaW5nLmZyb21DaGFyQ29kZSgweDVjKSB8fCBjID09IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg3ZilcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJSRkMyNjE2IGNvb2tpZSAnXCIgKyBuYW1lICsgXCInIGNhbm5vdCBjb250YWluIGNoYXJhY3RlciAnXCIgKyBjICsgXCInXCIsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoYyA+IFN0cmluZy5mcm9tQ2hhckNvZGUoMHg4MCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJSRkMyNjE2IGNvb2tpZSAnXCIgKyBuYW1lICsgXCInIGNhbiBvbmx5IGhhdmUgVVMtQVNDSUkgY2hhcnMgYXMgdmFsdWVcIiArXG4gICAgICAgICAgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSxcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGUgQ29va2llIERvbWFpbi5cbiAqIFNlZSB7QGxpbmsgaHR0cHM6Ly9kYXRhdHJhY2tlci5pZXRmLm9yZy9kb2MvaHRtbC9yZmM2MjY1I3NlY3Rpb24tNC4xLjIuM30uXG4gKiBAcGFyYW0gZG9tYWluIENvb2tpZSBkb21haW4uXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlRG9tYWluKGRvbWFpbjogc3RyaW5nKSB7XG4gIGlmIChkb21haW4gPT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjaGFyMSA9IGRvbWFpbi5jaGFyQXQoMCk7XG4gIGNvbnN0IGNoYXJOID0gZG9tYWluLmNoYXJBdChkb21haW4ubGVuZ3RoIC0gMSk7XG4gIGlmIChjaGFyMSA9PSBcIi1cIiB8fCBjaGFyTiA9PSBcIi5cIiB8fCBjaGFyTiA9PSBcIi1cIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiSW52YWxpZCBmaXJzdC9sYXN0IGNoYXIgaW4gY29va2llIGRvbWFpbjogXCIgKyBkb21haW4sXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGNvb2tpZXMgb2YgYSBoZWFkZXJcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGdldENvb2tpZXMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2Nvb2tpZS50c1wiO1xuICpcbiAqIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICogaGVhZGVycy5zZXQoXCJDb29raWVcIiwgXCJmdWxsPW9mOyB0YXN0eT1jaG9jb2xhdGVcIik7XG4gKlxuICogY29uc3QgY29va2llcyA9IGdldENvb2tpZXMoaGVhZGVycyk7XG4gKiBjb25zb2xlLmxvZyhjb29raWVzKTsgLy8geyBmdWxsOiBcIm9mXCIsIHRhc3R5OiBcImNob2NvbGF0ZVwiIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBoZWFkZXJzIFRoZSBoZWFkZXJzIGluc3RhbmNlIHRvIGdldCBjb29raWVzIGZyb21cbiAqIEByZXR1cm4gT2JqZWN0IHdpdGggY29va2llIG5hbWVzIGFzIGtleXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvb2tpZXMoaGVhZGVyczogSGVhZGVycyk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCBjb29raWUgPSBoZWFkZXJzLmdldChcIkNvb2tpZVwiKTtcbiAgaWYgKGNvb2tpZSAhPSBudWxsKSB7XG4gICAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgY29uc3QgYyA9IGNvb2tpZS5zcGxpdChcIjtcIik7XG4gICAgZm9yIChjb25zdCBrdiBvZiBjKSB7XG4gICAgICBjb25zdCBbY29va2llS2V5LCAuLi5jb29raWVWYWxdID0ga3Yuc3BsaXQoXCI9XCIpO1xuICAgICAgYXNzZXJ0KGNvb2tpZUtleSAhPSBudWxsKTtcbiAgICAgIGNvbnN0IGtleSA9IGNvb2tpZUtleS50cmltKCk7XG4gICAgICBvdXRba2V5XSA9IGNvb2tpZVZhbC5qb2luKFwiPVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuICByZXR1cm4ge307XG59XG5cbi8qKlxuICogU2V0IHRoZSBjb29raWUgaGVhZGVyIHByb3Blcmx5IGluIHRoZSBoZWFkZXJzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICBDb29raWUsXG4gKiAgIHNldENvb2tpZSxcbiAqIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9jb29raWUudHNcIjtcbiAqXG4gKiBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcbiAqIGNvbnN0IGNvb2tpZTogQ29va2llID0geyBuYW1lOiBcIlNwYWNlXCIsIHZhbHVlOiBcIkNhdFwiIH07XG4gKiBzZXRDb29raWUoaGVhZGVycywgY29va2llKTtcbiAqXG4gKiBjb25zdCBjb29raWVIZWFkZXIgPSBoZWFkZXJzLmdldChcInNldC1jb29raWVcIik7XG4gKiBjb25zb2xlLmxvZyhjb29raWVIZWFkZXIpOyAvLyBTcGFjZT1DYXRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBoZWFkZXJzIFRoZSBoZWFkZXJzIGluc3RhbmNlIHRvIHNldCB0aGUgY29va2llIHRvXG4gKiBAcGFyYW0gY29va2llIENvb2tpZSB0byBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldENvb2tpZShoZWFkZXJzOiBIZWFkZXJzLCBjb29raWU6IENvb2tpZSkge1xuICAvLyBQYXJzaW5nIGNvb2tpZSBoZWFkZXJzIHRvIG1ha2UgY29uc2lzdGVudCBzZXQtY29va2llIGhlYWRlclxuICAvLyByZWY6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2MjY1I3NlY3Rpb24tNC4xLjFcbiAgY29uc3QgdiA9IHRvU3RyaW5nKGNvb2tpZSk7XG4gIGlmICh2KSB7XG4gICAgaGVhZGVycy5hcHBlbmQoXCJTZXQtQ29va2llXCIsIHYpO1xuICB9XG59XG5cbi8qKlxuICogU2V0IHRoZSBjb29raWUgaGVhZGVyIHdpdGggZW1wdHkgdmFsdWUgaW4gdGhlIGhlYWRlcnMgdG8gZGVsZXRlIGl0XG4gKlxuICogPiBOb3RlOiBEZWxldGluZyBhIGBDb29raWVgIHdpbGwgc2V0IGl0cyBleHBpcmF0aW9uIGRhdGUgYmVmb3JlIG5vdy4gRm9yY2luZ1xuICogPiB0aGUgYnJvd3NlciB0byBkZWxldGUgaXQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBkZWxldGVDb29raWUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2Nvb2tpZS50c1wiO1xuICpcbiAqIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycygpO1xuICogZGVsZXRlQ29va2llKGhlYWRlcnMsIFwiZGVub1wiKTtcbiAqXG4gKiBjb25zdCBjb29raWVIZWFkZXIgPSBoZWFkZXJzLmdldChcInNldC1jb29raWVcIik7XG4gKiBjb25zb2xlLmxvZyhjb29raWVIZWFkZXIpOyAvLyBkZW5vPTsgRXhwaXJlcz1UaHVzLCAwMSBKYW4gMTk3MCAwMDowMDowMCBHTVRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBoZWFkZXJzIFRoZSBoZWFkZXJzIGluc3RhbmNlIHRvIGRlbGV0ZSB0aGUgY29va2llIGZyb21cbiAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgY29va2llXG4gKiBAcGFyYW0gYXR0cmlidXRlcyBBZGRpdGlvbmFsIGNvb2tpZSBhdHRyaWJ1dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVDb29raWUoXG4gIGhlYWRlcnM6IEhlYWRlcnMsXG4gIG5hbWU6IHN0cmluZyxcbiAgYXR0cmlidXRlcz86IHsgcGF0aD86IHN0cmluZzsgZG9tYWluPzogc3RyaW5nIH0sXG4pIHtcbiAgc2V0Q29va2llKGhlYWRlcnMsIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIHZhbHVlOiBcIlwiLFxuICAgIGV4cGlyZXM6IG5ldyBEYXRlKDApLFxuICAgIC4uLmF0dHJpYnV0ZXMsXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwYXJzZVNldENvb2tpZSh2YWx1ZTogc3RyaW5nKTogQ29va2llIHwgbnVsbCB7XG4gIGNvbnN0IGF0dHJzID0gdmFsdWVcbiAgICAuc3BsaXQoXCI7XCIpXG4gICAgLm1hcCgoYXR0cikgPT4ge1xuICAgICAgY29uc3QgW2tleSwgLi4udmFsdWVzXSA9IGF0dHIudHJpbSgpLnNwbGl0KFwiPVwiKTtcbiAgICAgIHJldHVybiBba2V5LCB2YWx1ZXMuam9pbihcIj1cIildO1xuICAgIH0pO1xuICBjb25zdCBjb29raWU6IENvb2tpZSA9IHtcbiAgICBuYW1lOiBhdHRyc1swXVswXSxcbiAgICB2YWx1ZTogYXR0cnNbMF1bMV0sXG4gIH07XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgYXR0cnMuc2xpY2UoMSkpIHtcbiAgICBzd2l0Y2ggKGtleS50b0xvY2FsZUxvd2VyQ2FzZSgpKSB7XG4gICAgICBjYXNlIFwiZXhwaXJlc1wiOlxuICAgICAgICBjb29raWUuZXhwaXJlcyA9IG5ldyBEYXRlKHZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwibWF4LWFnZVwiOlxuICAgICAgICBjb29raWUubWF4QWdlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgaWYgKGNvb2tpZS5tYXhBZ2UgPCAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgXCJNYXgtQWdlIG11c3QgYmUgYW4gaW50ZWdlciBzdXBlcmlvciBvciBlcXVhbCB0byAwLiBDb29raWUgaWdub3JlZC5cIixcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImRvbWFpblwiOlxuICAgICAgICBjb29raWUuZG9tYWluID0gdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInBhdGhcIjpcbiAgICAgICAgY29va2llLnBhdGggPSB2YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwic2VjdXJlXCI6XG4gICAgICAgIGNvb2tpZS5zZWN1cmUgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJodHRwb25seVwiOlxuICAgICAgICBjb29raWUuaHR0cE9ubHkgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJzYW1lc2l0ZVwiOlxuICAgICAgICBjb29raWUuc2FtZVNpdGUgPSB2YWx1ZSBhcyBDb29raWVbXCJzYW1lU2l0ZVwiXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29va2llLnVucGFyc2VkKSkge1xuICAgICAgICAgIGNvb2tpZS51bnBhcnNlZCA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvb2tpZS51bnBhcnNlZC5wdXNoKFtrZXksIHZhbHVlXS5qb2luKFwiPVwiKSk7XG4gICAgfVxuICB9XG4gIGlmIChjb29raWUubmFtZS5zdGFydHNXaXRoKFwiX19TZWN1cmUtXCIpKSB7XG4gICAgLyoqIFRoaXMgcmVxdWlyZW1lbnQgaXMgbWVudGlvbmVkIGluIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9TZXQtQ29va2llIGJ1dCBub3QgdGhlIFJGQy4gKi9cbiAgICBpZiAoIWNvb2tpZS5zZWN1cmUpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgXCJDb29raWVzIHdpdGggbmFtZXMgc3RhcnRpbmcgd2l0aCBgX19TZWN1cmUtYCBtdXN0IGJlIHNldCB3aXRoIHRoZSBzZWN1cmUgZmxhZy4gQ29va2llIGlnbm9yZWQuXCIsXG4gICAgICApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIGlmIChjb29raWUubmFtZS5zdGFydHNXaXRoKFwiX19Ib3N0LVwiKSkge1xuICAgIGlmICghY29va2llLnNlY3VyZSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBcIkNvb2tpZXMgd2l0aCBuYW1lcyBzdGFydGluZyB3aXRoIGBfX0hvc3QtYCBtdXN0IGJlIHNldCB3aXRoIHRoZSBzZWN1cmUgZmxhZy4gQ29va2llIGlnbm9yZWQuXCIsXG4gICAgICApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChjb29raWUuZG9tYWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgXCJDb29raWVzIHdpdGggbmFtZXMgc3RhcnRpbmcgd2l0aCBgX19Ib3N0LWAgbXVzdCBub3QgaGF2ZSBhIGRvbWFpbiBzcGVjaWZpZWQuIENvb2tpZSBpZ25vcmVkLlwiLFxuICAgICAgKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoY29va2llLnBhdGggIT09IFwiL1wiKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIFwiQ29va2llcyB3aXRoIG5hbWVzIHN0YXJ0aW5nIHdpdGggYF9fSG9zdC1gIG11c3QgaGF2ZSBwYXRoIGJlIGAvYC4gQ29va2llIGhhcyBiZWVuIGlnbm9yZWQuXCIsXG4gICAgICApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb29raWU7XG59XG5cbi8qKlxuICogUGFyc2Ugc2V0LWNvb2tpZXMgb2YgYSBoZWFkZXJcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGdldFNldENvb2tpZXMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2Nvb2tpZS50c1wiO1xuICpcbiAqIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhbXG4gKiAgIFtcIlNldC1Db29raWVcIiwgXCJsdWx1PW1lb3c7IFNlY3VyZTsgTWF4LUFnZT0zNjAwXCJdLFxuICogICBbXCJTZXQtQ29va2llXCIsIFwiYm9veWE9a2FzaGE7IEh0dHBPbmx5OyBQYXRoPS9cIl0sXG4gKiBdKTtcbiAqXG4gKiBjb25zdCBjb29raWVzID0gZ2V0U2V0Q29va2llcyhoZWFkZXJzKTtcbiAqIGNvbnNvbGUubG9nKGNvb2tpZXMpOyAvLyBbeyBuYW1lOiBcImx1bHVcIiwgdmFsdWU6IFwibWVvd1wiLCBzZWN1cmU6IHRydWUsIG1heEFnZTogMzYwMCB9LCB7IG5hbWU6IFwiYm9veWFcIiwgdmFsdWU6IFwia2Foc2FcIiwgaHR0cE9ubHk6IHRydWUsIHBhdGg6IFwiLyB9XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGhlYWRlcnMgVGhlIGhlYWRlcnMgaW5zdGFuY2UgdG8gZ2V0IHNldC1jb29raWVzIGZyb21cbiAqIEByZXR1cm4gTGlzdCBvZiBjb29raWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXRDb29raWVzKGhlYWRlcnM6IEhlYWRlcnMpOiBDb29raWVbXSB7XG4gIGlmICghaGVhZGVycy5oYXMoXCJzZXQtY29va2llXCIpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBbLi4uaGVhZGVycy5lbnRyaWVzKCldXG4gICAgLmZpbHRlcigoW2tleV0pID0+IGtleSA9PT0gXCJzZXQtY29va2llXCIpXG4gICAgLm1hcCgoW18sIHZhbHVlXSkgPT4gdmFsdWUpXG4gICAgLyoqIFBhcnNlIGVhY2ggYHNldC1jb29raWVgIGhlYWRlciBzZXBhcmF0ZWx5ICovXG4gICAgLm1hcChwYXJzZVNldENvb2tpZSlcbiAgICAvKiogU2tpcCBlbXB0eSBjb29raWVzICovXG4gICAgLmZpbHRlcihCb29sZWFuKSBhcyBDb29raWVbXTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUseUNBQXlDO0FBQ3pDLGtFQUFrRTtBQUNsRSxxQ0FBcUM7QUFFckMsU0FBUyxNQUFNLFFBQVEscUJBQXFCLENBQUM7QUFDN0MsU0FBUyxLQUFLLFFBQVEsdUJBQXVCLENBQUM7QUFvRDlDLE1BQU0sb0JBQW9CLGlEQUFpRCxBQUFDO0FBRTVFLFNBQVMsUUFBUSxDQUFDLE1BQWMsRUFBVTtJQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTtRQUNoQixPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFDRCxNQUFNLEdBQUcsR0FBYSxFQUFFLEFBQUM7SUFDekIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7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