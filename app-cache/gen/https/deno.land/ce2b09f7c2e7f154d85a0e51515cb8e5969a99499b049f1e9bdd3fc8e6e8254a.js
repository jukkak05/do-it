// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/** A collection of HTTP errors and utilities.
 *
 * The export {@linkcode errors} contains an individual class that extends
 * {@linkcode HttpError} which makes handling HTTP errors in a structured way.
 *
 * The function {@linkcode createHttpError} provides a way to create instances
 * of errors in a factory pattern.
 *
 * The function {@linkcode isHttpError} is a type guard that will narrow a value
 * to an `HttpError` instance.
 *
 * @example
 * ```ts
 * import { errors, isHttpError } from "https://deno.land/std@$STD_VERSION/http/http_errors.ts";
 *
 * try {
 *   throw new errors.NotFound();
 * } catch (e) {
 *   if (isHttpError(e)) {
 *     const response = new Response(e.message, { status: e.status });
 *   } else {
 *     throw e;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * import { createHttpError } from "https://deno.land/std@$STD_VERSION/http/http_errors.ts";
 * import { Status } from "https://deno.land/std@$STD_VERSION/http/http_status.ts";
 *
 * try {
 *   throw createHttpError(
 *     Status.BadRequest,
 *     "The request was bad.",
 *     { expose: false }
 *   );
 * } catch (e) {
 *   // handle errors
 * }
 * ```
 *
 * @module
 */ import { isClientErrorStatus, Status, STATUS_TEXT } from "./http_status.ts";
const ERROR_STATUS_MAP = {
    "BadRequest": 400,
    "Unauthorized": 401,
    "PaymentRequired": 402,
    "Forbidden": 403,
    "NotFound": 404,
    "MethodNotAllowed": 405,
    "NotAcceptable": 406,
    "ProxyAuthRequired": 407,
    "RequestTimeout": 408,
    "Conflict": 409,
    "Gone": 410,
    "LengthRequired": 411,
    "PreconditionFailed": 412,
    "RequestEntityTooLarge": 413,
    "RequestURITooLong": 414,
    "UnsupportedMediaType": 415,
    "RequestedRangeNotSatisfiable": 416,
    "ExpectationFailed": 417,
    "Teapot": 418,
    "MisdirectedRequest": 421,
    "UnprocessableEntity": 422,
    "Locked": 423,
    "FailedDependency": 424,
    "UpgradeRequired": 426,
    "PreconditionRequired": 428,
    "TooManyRequests": 429,
    "RequestHeaderFieldsTooLarge": 431,
    "UnavailableForLegalReasons": 451,
    "InternalServerError": 500,
    "NotImplemented": 501,
    "BadGateway": 502,
    "ServiceUnavailable": 503,
    "GatewayTimeout": 504,
    "HTTPVersionNotSupported": 505,
    "VariantAlsoNegotiates": 506,
    "InsufficientStorage": 507,
    "LoopDetected": 508,
    "NotExtended": 510,
    "NetworkAuthenticationRequired": 511
};
/** The base class that all derivative HTTP extend, providing a `status` and an
 * `expose` property. */ export class HttpError extends Error {
    #status = Status.InternalServerError;
    #expose;
    #headers;
    constructor(message = "Http Error", options){
        super(message, options);
        this.#expose = options?.expose === undefined ? isClientErrorStatus(this.status) : options.expose;
        if (options?.headers) {
            this.#headers = new Headers(options.headers);
        }
    }
    /** A flag to indicate if the internals of the error, like the stack, should
   * be exposed to a client, or if they are "private" and should not be leaked.
   * By default, all client errors are `true` and all server errors are
   * `false`. */ get expose() {
        return this.#expose;
    }
    /** The optional headers object that is set on the error. */ get headers() {
        return this.#headers;
    }
    /** The error status that is set on the error. */ get status() {
        return this.#status;
    }
}
function createHttpErrorConstructor(status) {
    const name = `${Status[status]}Error`;
    const ErrorCtor = class extends HttpError {
        constructor(message = STATUS_TEXT[status], options){
            super(message, options);
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                value: name,
                writable: true
            });
        }
        get status() {
            return status;
        }
    };
    return ErrorCtor;
}
/**
 * A namespace that contains each error constructor. Each error extends
 * `HTTPError` and provides `.status` and `.expose` properties, where the
 * `.status` will be an error `Status` value and `.expose` indicates if
 * information, like a stack trace, should be shared in the response.
 *
 * By default, `.expose` is set to false in server errors, and true for client
 * errors.
 *
 * @example
 * ```ts
 * import { errors } from "https://deno.land/std@$STD_VERSION/http/http_errors.ts";
 *
 * throw new errors.InternalServerError("Ooops!");
 * ```
 */ export const errors = {};
for (const [key, value] of Object.entries(ERROR_STATUS_MAP)){
    errors[key] = createHttpErrorConstructor(value);
}
/**
 * A factory function which provides a way to create errors. It takes up to 3
 * arguments, the error `Status`, an message, which defaults to the status text
 * and error options, which incudes the `expose` property to set the `.expose`
 * value on the error.
 */ export function createHttpError(status = Status.InternalServerError, message, options) {
    return new errors[Status[status]](message, options);
}
/** A type guard that determines if the value is an HttpError or not. */ export function isHttpError(value) {
    return value instanceof HttpError;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvaHR0cF9lcnJvcnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqIEEgY29sbGVjdGlvbiBvZiBIVFRQIGVycm9ycyBhbmQgdXRpbGl0aWVzLlxuICpcbiAqIFRoZSBleHBvcnQge0BsaW5rY29kZSBlcnJvcnN9IGNvbnRhaW5zIGFuIGluZGl2aWR1YWwgY2xhc3MgdGhhdCBleHRlbmRzXG4gKiB7QGxpbmtjb2RlIEh0dHBFcnJvcn0gd2hpY2ggbWFrZXMgaGFuZGxpbmcgSFRUUCBlcnJvcnMgaW4gYSBzdHJ1Y3R1cmVkIHdheS5cbiAqXG4gKiBUaGUgZnVuY3Rpb24ge0BsaW5rY29kZSBjcmVhdGVIdHRwRXJyb3J9IHByb3ZpZGVzIGEgd2F5IHRvIGNyZWF0ZSBpbnN0YW5jZXNcbiAqIG9mIGVycm9ycyBpbiBhIGZhY3RvcnkgcGF0dGVybi5cbiAqXG4gKiBUaGUgZnVuY3Rpb24ge0BsaW5rY29kZSBpc0h0dHBFcnJvcn0gaXMgYSB0eXBlIGd1YXJkIHRoYXQgd2lsbCBuYXJyb3cgYSB2YWx1ZVxuICogdG8gYW4gYEh0dHBFcnJvcmAgaW5zdGFuY2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBlcnJvcnMsIGlzSHR0cEVycm9yIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9odHRwX2Vycm9ycy50c1wiO1xuICpcbiAqIHRyeSB7XG4gKiAgIHRocm93IG5ldyBlcnJvcnMuTm90Rm91bmQoKTtcbiAqIH0gY2F0Y2ggKGUpIHtcbiAqICAgaWYgKGlzSHR0cEVycm9yKGUpKSB7XG4gKiAgICAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoZS5tZXNzYWdlLCB7IHN0YXR1czogZS5zdGF0dXMgfSk7XG4gKiAgIH0gZWxzZSB7XG4gKiAgICAgdGhyb3cgZTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGVIdHRwRXJyb3IgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2h0dHBfZXJyb3JzLnRzXCI7XG4gKiBpbXBvcnQgeyBTdGF0dXMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2h0dHBfc3RhdHVzLnRzXCI7XG4gKlxuICogdHJ5IHtcbiAqICAgdGhyb3cgY3JlYXRlSHR0cEVycm9yKFxuICogICAgIFN0YXR1cy5CYWRSZXF1ZXN0LFxuICogICAgIFwiVGhlIHJlcXVlc3Qgd2FzIGJhZC5cIixcbiAqICAgICB7IGV4cG9zZTogZmFsc2UgfVxuICogICApO1xuICogfSBjYXRjaCAoZSkge1xuICogICAvLyBoYW5kbGUgZXJyb3JzXG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHtcbiAgdHlwZSBFcnJvclN0YXR1cyxcbiAgaXNDbGllbnRFcnJvclN0YXR1cyxcbiAgU3RhdHVzLFxuICBTVEFUVVNfVEVYVCxcbn0gZnJvbSBcIi4vaHR0cF9zdGF0dXMudHNcIjtcblxuY29uc3QgRVJST1JfU1RBVFVTX01BUCA9IHtcbiAgXCJCYWRSZXF1ZXN0XCI6IDQwMCxcbiAgXCJVbmF1dGhvcml6ZWRcIjogNDAxLFxuICBcIlBheW1lbnRSZXF1aXJlZFwiOiA0MDIsXG4gIFwiRm9yYmlkZGVuXCI6IDQwMyxcbiAgXCJOb3RGb3VuZFwiOiA0MDQsXG4gIFwiTWV0aG9kTm90QWxsb3dlZFwiOiA0MDUsXG4gIFwiTm90QWNjZXB0YWJsZVwiOiA0MDYsXG4gIFwiUHJveHlBdXRoUmVxdWlyZWRcIjogNDA3LFxuICBcIlJlcXVlc3RUaW1lb3V0XCI6IDQwOCxcbiAgXCJDb25mbGljdFwiOiA0MDksXG4gIFwiR29uZVwiOiA0MTAsXG4gIFwiTGVuZ3RoUmVxdWlyZWRcIjogNDExLFxuICBcIlByZWNvbmRpdGlvbkZhaWxlZFwiOiA0MTIsXG4gIFwiUmVxdWVzdEVudGl0eVRvb0xhcmdlXCI6IDQxMyxcbiAgXCJSZXF1ZXN0VVJJVG9vTG9uZ1wiOiA0MTQsXG4gIFwiVW5zdXBwb3J0ZWRNZWRpYVR5cGVcIjogNDE1LFxuICBcIlJlcXVlc3RlZFJhbmdlTm90U2F0aXNmaWFibGVcIjogNDE2LFxuICBcIkV4cGVjdGF0aW9uRmFpbGVkXCI6IDQxNyxcbiAgXCJUZWFwb3RcIjogNDE4LFxuICBcIk1pc2RpcmVjdGVkUmVxdWVzdFwiOiA0MjEsXG4gIFwiVW5wcm9jZXNzYWJsZUVudGl0eVwiOiA0MjIsXG4gIFwiTG9ja2VkXCI6IDQyMyxcbiAgXCJGYWlsZWREZXBlbmRlbmN5XCI6IDQyNCxcbiAgXCJVcGdyYWRlUmVxdWlyZWRcIjogNDI2LFxuICBcIlByZWNvbmRpdGlvblJlcXVpcmVkXCI6IDQyOCxcbiAgXCJUb29NYW55UmVxdWVzdHNcIjogNDI5LFxuICBcIlJlcXVlc3RIZWFkZXJGaWVsZHNUb29MYXJnZVwiOiA0MzEsXG4gIFwiVW5hdmFpbGFibGVGb3JMZWdhbFJlYXNvbnNcIjogNDUxLFxuICBcIkludGVybmFsU2VydmVyRXJyb3JcIjogNTAwLFxuICBcIk5vdEltcGxlbWVudGVkXCI6IDUwMSxcbiAgXCJCYWRHYXRld2F5XCI6IDUwMixcbiAgXCJTZXJ2aWNlVW5hdmFpbGFibGVcIjogNTAzLFxuICBcIkdhdGV3YXlUaW1lb3V0XCI6IDUwNCxcbiAgXCJIVFRQVmVyc2lvbk5vdFN1cHBvcnRlZFwiOiA1MDUsXG4gIFwiVmFyaWFudEFsc29OZWdvdGlhdGVzXCI6IDUwNixcbiAgXCJJbnN1ZmZpY2llbnRTdG9yYWdlXCI6IDUwNyxcbiAgXCJMb29wRGV0ZWN0ZWRcIjogNTA4LFxuICBcIk5vdEV4dGVuZGVkXCI6IDUxMCxcbiAgXCJOZXR3b3JrQXV0aGVudGljYXRpb25SZXF1aXJlZFwiOiA1MTEsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBFcnJvclN0YXR1c0tleXMgPSBrZXlvZiB0eXBlb2YgRVJST1JfU1RBVFVTX01BUDtcblxuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3JPcHRpb25zIGV4dGVuZHMgRXJyb3JPcHRpb25zIHtcbiAgZXhwb3NlPzogYm9vbGVhbjtcbiAgaGVhZGVycz86IEhlYWRlcnNJbml0O1xufVxuXG4vKiogVGhlIGJhc2UgY2xhc3MgdGhhdCBhbGwgZGVyaXZhdGl2ZSBIVFRQIGV4dGVuZCwgcHJvdmlkaW5nIGEgYHN0YXR1c2AgYW5kIGFuXG4gKiBgZXhwb3NlYCBwcm9wZXJ0eS4gKi9cbmV4cG9ydCBjbGFzcyBIdHRwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICNzdGF0dXM6IEVycm9yU3RhdHVzID0gU3RhdHVzLkludGVybmFsU2VydmVyRXJyb3I7XG4gICNleHBvc2U6IGJvb2xlYW47XG4gICNoZWFkZXJzPzogSGVhZGVycztcbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZSA9IFwiSHR0cCBFcnJvclwiLFxuICAgIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlLCBvcHRpb25zKTtcbiAgICB0aGlzLiNleHBvc2UgPSBvcHRpb25zPy5leHBvc2UgPT09IHVuZGVmaW5lZFxuICAgICAgPyBpc0NsaWVudEVycm9yU3RhdHVzKHRoaXMuc3RhdHVzKVxuICAgICAgOiBvcHRpb25zLmV4cG9zZTtcbiAgICBpZiAob3B0aW9ucz8uaGVhZGVycykge1xuICAgICAgdGhpcy4jaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgfVxuICB9XG4gIC8qKiBBIGZsYWcgdG8gaW5kaWNhdGUgaWYgdGhlIGludGVybmFscyBvZiB0aGUgZXJyb3IsIGxpa2UgdGhlIHN0YWNrLCBzaG91bGRcbiAgICogYmUgZXhwb3NlZCB0byBhIGNsaWVudCwgb3IgaWYgdGhleSBhcmUgXCJwcml2YXRlXCIgYW5kIHNob3VsZCBub3QgYmUgbGVha2VkLlxuICAgKiBCeSBkZWZhdWx0LCBhbGwgY2xpZW50IGVycm9ycyBhcmUgYHRydWVgIGFuZCBhbGwgc2VydmVyIGVycm9ycyBhcmVcbiAgICogYGZhbHNlYC4gKi9cbiAgZ2V0IGV4cG9zZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4jZXhwb3NlO1xuICB9XG4gIC8qKiBUaGUgb3B0aW9uYWwgaGVhZGVycyBvYmplY3QgdGhhdCBpcyBzZXQgb24gdGhlIGVycm9yLiAqL1xuICBnZXQgaGVhZGVycygpOiBIZWFkZXJzIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jaGVhZGVycztcbiAgfVxuICAvKiogVGhlIGVycm9yIHN0YXR1cyB0aGF0IGlzIHNldCBvbiB0aGUgZXJyb3IuICovXG4gIGdldCBzdGF0dXMoKTogRXJyb3JTdGF0dXMge1xuICAgIHJldHVybiB0aGlzLiNzdGF0dXM7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlSHR0cEVycm9yQ29uc3RydWN0b3Ioc3RhdHVzOiBFcnJvclN0YXR1cyk6IHR5cGVvZiBIdHRwRXJyb3Ige1xuICBjb25zdCBuYW1lID0gYCR7U3RhdHVzW3N0YXR1c119RXJyb3JgO1xuICBjb25zdCBFcnJvckN0b3IgPSBjbGFzcyBleHRlbmRzIEh0dHBFcnJvciB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICBtZXNzYWdlID0gU1RBVFVTX1RFWFRbc3RhdHVzXSxcbiAgICAgIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuICAgICkge1xuICAgICAgc3VwZXIobWVzc2FnZSwgb3B0aW9ucyk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJuYW1lXCIsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgb3ZlcnJpZGUgZ2V0IHN0YXR1cygpIHtcbiAgICAgIHJldHVybiBzdGF0dXM7XG4gICAgfVxuICB9O1xuICByZXR1cm4gRXJyb3JDdG9yO1xufVxuXG4vKipcbiAqIEEgbmFtZXNwYWNlIHRoYXQgY29udGFpbnMgZWFjaCBlcnJvciBjb25zdHJ1Y3Rvci4gRWFjaCBlcnJvciBleHRlbmRzXG4gKiBgSFRUUEVycm9yYCBhbmQgcHJvdmlkZXMgYC5zdGF0dXNgIGFuZCBgLmV4cG9zZWAgcHJvcGVydGllcywgd2hlcmUgdGhlXG4gKiBgLnN0YXR1c2Agd2lsbCBiZSBhbiBlcnJvciBgU3RhdHVzYCB2YWx1ZSBhbmQgYC5leHBvc2VgIGluZGljYXRlcyBpZlxuICogaW5mb3JtYXRpb24sIGxpa2UgYSBzdGFjayB0cmFjZSwgc2hvdWxkIGJlIHNoYXJlZCBpbiB0aGUgcmVzcG9uc2UuXG4gKlxuICogQnkgZGVmYXVsdCwgYC5leHBvc2VgIGlzIHNldCB0byBmYWxzZSBpbiBzZXJ2ZXIgZXJyb3JzLCBhbmQgdHJ1ZSBmb3IgY2xpZW50XG4gKiBlcnJvcnMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBlcnJvcnMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL2h0dHBfZXJyb3JzLnRzXCI7XG4gKlxuICogdGhyb3cgbmV3IGVycm9ycy5JbnRlcm5hbFNlcnZlckVycm9yKFwiT29vcHMhXCIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlcnJvcnM6IFJlY29yZDxFcnJvclN0YXR1c0tleXMsIHR5cGVvZiBIdHRwRXJyb3I+ID0ge30gYXMgUmVjb3JkPFxuICBFcnJvclN0YXR1c0tleXMsXG4gIHR5cGVvZiBIdHRwRXJyb3Jcbj47XG5cbmZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKEVSUk9SX1NUQVRVU19NQVApKSB7XG4gIGVycm9yc1trZXkgYXMgRXJyb3JTdGF0dXNLZXlzXSA9IGNyZWF0ZUh0dHBFcnJvckNvbnN0cnVjdG9yKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBBIGZhY3RvcnkgZnVuY3Rpb24gd2hpY2ggcHJvdmlkZXMgYSB3YXkgdG8gY3JlYXRlIGVycm9ycy4gSXQgdGFrZXMgdXAgdG8gM1xuICogYXJndW1lbnRzLCB0aGUgZXJyb3IgYFN0YXR1c2AsIGFuIG1lc3NhZ2UsIHdoaWNoIGRlZmF1bHRzIHRvIHRoZSBzdGF0dXMgdGV4dFxuICogYW5kIGVycm9yIG9wdGlvbnMsIHdoaWNoIGluY3VkZXMgdGhlIGBleHBvc2VgIHByb3BlcnR5IHRvIHNldCB0aGUgYC5leHBvc2VgXG4gKiB2YWx1ZSBvbiB0aGUgZXJyb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVIdHRwRXJyb3IoXG4gIHN0YXR1czogRXJyb3JTdGF0dXMgPSBTdGF0dXMuSW50ZXJuYWxTZXJ2ZXJFcnJvcixcbiAgbWVzc2FnZT86IHN0cmluZyxcbiAgb3B0aW9ucz86IEh0dHBFcnJvck9wdGlvbnMsXG4pOiBIdHRwRXJyb3Ige1xuICByZXR1cm4gbmV3IGVycm9yc1tTdGF0dXNbc3RhdHVzXSBhcyBFcnJvclN0YXR1c0tleXNdKG1lc3NhZ2UsIG9wdGlvbnMpO1xufVxuXG4vKiogQSB0eXBlIGd1YXJkIHRoYXQgZGV0ZXJtaW5lcyBpZiB0aGUgdmFsdWUgaXMgYW4gSHR0cEVycm9yIG9yIG5vdC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0h0dHBFcnJvcih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEh0dHBFcnJvciB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIEh0dHBFcnJvcjtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBRXJDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBMkNDLEdBRUQsU0FFRSxtQkFBbUIsRUFDbkIsTUFBTSxF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