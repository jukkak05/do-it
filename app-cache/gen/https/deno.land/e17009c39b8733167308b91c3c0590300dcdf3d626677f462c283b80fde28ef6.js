// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
/**
 * Provides user-friendly {@linkcode serve} on top of Deno's native HTTP server
 * and other utilities for creating HTTP servers and clients.
 *
 * ## Server
 *
 * Server APIs utilizing Deno's
 * [HTTP server APIs](https://deno.land/manual/runtime/http_server_apis#http-server-apis).
 *
 * ```ts
 * import { serve } from "https://deno.land/std@$STD_VERSION/http/server.ts";
 *
 * serve(() => new Response("Hello World\n"));
 *
 * console.log("http://localhost:8000/");
 * ```
 *
 * ## File Server
 *
 * A small program for serving local files over HTTP.
 *
 * ```sh
 * deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts
 * > HTTP server listening on http://localhost:4507/
 * ```
 *
 * ## HTTP Status Code and Status Text
 *
 * Helper for processing status code and status text.
 *
 * ## HTTP errors
 *
 * Provides error classes for each HTTP error status code as well as utility
 * functions for handling HTTP errors in a structured way.
 *
 * ## Negotiation
 *
 * A set of functions which can be used to negotiate content types, encodings and
 * languages when responding to requests.
 *
 * > Note: some libraries include accept charset functionality by analyzing the
 * > `Accept-Charset` header. This is a legacy header that
 * > [clients omit and servers should ignore](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Charset)
 * > therefore is not provided.
 *
 * ## Cookie maps
 *
 * An alternative to `cookie.ts` is `cookie_map.ts` which provides `CookieMap`,
 * `SecureCookieMap`, and `mergeHeaders` to manage request and response cookies
 * with the familiar `Map` interface.
 *
 * @module
 */ export * from "./cookie.ts";
export * from "./cookie_map.ts";
export * from "./http_errors.ts";
export * from "./http_status.ts";
export * from "./negotiation.ts";
export * from "./server.ts";
export * from "./server_sent_event.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjMgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vKipcbiAqIFByb3ZpZGVzIHVzZXItZnJpZW5kbHkge0BsaW5rY29kZSBzZXJ2ZX0gb24gdG9wIG9mIERlbm8ncyBuYXRpdmUgSFRUUCBzZXJ2ZXJcbiAqIGFuZCBvdGhlciB1dGlsaXRpZXMgZm9yIGNyZWF0aW5nIEhUVFAgc2VydmVycyBhbmQgY2xpZW50cy5cbiAqXG4gKiAjIyBTZXJ2ZXJcbiAqXG4gKiBTZXJ2ZXIgQVBJcyB1dGlsaXppbmcgRGVubydzXG4gKiBbSFRUUCBzZXJ2ZXIgQVBJc10oaHR0cHM6Ly9kZW5vLmxhbmQvbWFudWFsL3J1bnRpbWUvaHR0cF9zZXJ2ZXJfYXBpcyNodHRwLXNlcnZlci1hcGlzKS5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL3NlcnZlci50c1wiO1xuICpcbiAqIHNlcnZlKCgpID0+IG5ldyBSZXNwb25zZShcIkhlbGxvIFdvcmxkXFxuXCIpKTtcbiAqXG4gKiBjb25zb2xlLmxvZyhcImh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9cIik7XG4gKiBgYGBcbiAqXG4gKiAjIyBGaWxlIFNlcnZlclxuICpcbiAqIEEgc21hbGwgcHJvZ3JhbSBmb3Igc2VydmluZyBsb2NhbCBmaWxlcyBvdmVyIEhUVFAuXG4gKlxuICogYGBgc2hcbiAqIGRlbm8gcnVuIC0tYWxsb3ctbmV0IC0tYWxsb3ctcmVhZCBodHRwczovL2Rlbm8ubGFuZC9zdGQvaHR0cC9maWxlX3NlcnZlci50c1xuICogPiBIVFRQIHNlcnZlciBsaXN0ZW5pbmcgb24gaHR0cDovL2xvY2FsaG9zdDo0NTA3L1xuICogYGBgXG4gKlxuICogIyMgSFRUUCBTdGF0dXMgQ29kZSBhbmQgU3RhdHVzIFRleHRcbiAqXG4gKiBIZWxwZXIgZm9yIHByb2Nlc3Npbmcgc3RhdHVzIGNvZGUgYW5kIHN0YXR1cyB0ZXh0LlxuICpcbiAqICMjIEhUVFAgZXJyb3JzXG4gKlxuICogUHJvdmlkZXMgZXJyb3IgY2xhc3NlcyBmb3IgZWFjaCBIVFRQIGVycm9yIHN0YXR1cyBjb2RlIGFzIHdlbGwgYXMgdXRpbGl0eVxuICogZnVuY3Rpb25zIGZvciBoYW5kbGluZyBIVFRQIGVycm9ycyBpbiBhIHN0cnVjdHVyZWQgd2F5LlxuICpcbiAqICMjIE5lZ290aWF0aW9uXG4gKlxuICogQSBzZXQgb2YgZnVuY3Rpb25zIHdoaWNoIGNhbiBiZSB1c2VkIHRvIG5lZ290aWF0ZSBjb250ZW50IHR5cGVzLCBlbmNvZGluZ3MgYW5kXG4gKiBsYW5ndWFnZXMgd2hlbiByZXNwb25kaW5nIHRvIHJlcXVlc3RzLlxuICpcbiAqID4gTm90ZTogc29tZSBsaWJyYXJpZXMgaW5jbHVkZSBhY2NlcHQgY2hhcnNldCBmdW5jdGlvbmFsaXR5IGJ5IGFuYWx5emluZyB0aGVcbiAqID4gYEFjY2VwdC1DaGFyc2V0YCBoZWFkZXIuIFRoaXMgaXMgYSBsZWdhY3kgaGVhZGVyIHRoYXRcbiAqID4gW2NsaWVudHMgb21pdCBhbmQgc2VydmVycyBzaG91bGQgaWdub3JlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9IVFRQL0hlYWRlcnMvQWNjZXB0LUNoYXJzZXQpXG4gKiA+IHRoZXJlZm9yZSBpcyBub3QgcHJvdmlkZWQuXG4gKlxuICogIyMgQ29va2llIG1hcHNcbiAqXG4gKiBBbiBhbHRlcm5hdGl2ZSB0byBgY29va2llLnRzYCBpcyBgY29va2llX21hcC50c2Agd2hpY2ggcHJvdmlkZXMgYENvb2tpZU1hcGAsXG4gKiBgU2VjdXJlQ29va2llTWFwYCwgYW5kIGBtZXJnZUhlYWRlcnNgIHRvIG1hbmFnZSByZXF1ZXN0IGFuZCByZXNwb25zZSBjb29raWVzXG4gKiB3aXRoIHRoZSBmYW1pbGlhciBgTWFwYCBpbnRlcmZhY2UuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmV4cG9ydCAqIGZyb20gXCIuL2Nvb2tpZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vY29va2llX21hcC50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vaHR0cF9lcnJvcnMudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2h0dHBfc3RhdHVzLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9uZWdvdGlhdGlvbi50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vc2VydmVyLnRzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9zZXJ2ZXJfc2VudF9ldmVudC50c1wiO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW9EQyxHQUVELGNBQWMsYUFBYSxDQUFDO0FBQzVCLGNBQWMsaUJBQWlCLENBQUM7QUFDaEMsY0FBYyxrQkFBa0IsQ0FBQztBQUNqQyxjQUFjLGtCQUFrQixDQUFDO0FBQ2pDLGNBQWMsa0JBQWtCLENBQUM7QUFDakMsY0FBYyxhQUFhLENBQUM7QUFDNUIsY0FBYyx3QkFBd0IsQ0FBQyJ9