// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Provides {@linkcode ServerSentEvent} and
 * {@linkcode ServerSentEventStreamTarget} which provides an interface to send
 * server sent events to a browser using the DOM event model.
 *
 * The {@linkcode ServerSentEventStreamTarget} provides the `.asResponse()` or
 * `.asResponseInit()` to provide a body and headers to the client to establish
 * the event connection. This is accomplished by keeping a connection open to
 * the client by not closing the body, which allows events to be sent down the
 * connection and processed by the client browser.
 *
 * See more about Server-sent events on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
 *
 * ## Example
 *
 * ```ts
 * import {
 *   ServerSentEvent,
 *   ServerSentEventStreamTarget,
 * } from "https://deno.land/std@$STD_VERSION/http/server_sent_event.ts";
 * import { serve } from "https://deno.land/std@$STD_VERSION/http/server.ts";
 *
 * await serve((request) => {
 *   const target = new ServerSentEventStreamTarget();
 *   let counter = 0;
 *
 *   // Sends an event every 2 seconds, incrementing the ID
 *   const id = setInterval(() => {
 *     const evt = new ServerSentEvent(
 *       "message",
 *       { data: { hello: "world" }, id: counter++ },
 *     );
 *     target.dispatchEvent(evt);
 *   }, 2000);
 *
 *   target.addEventListener("close", () => clearInterval(id));
 *   return target.asResponse();
 * }, { port: 8000 });
 * ```
 *
 * @module
 */ import { assert } from "../_util/asserts.ts";
const encoder = new TextEncoder();
const DEFAULT_KEEP_ALIVE_INTERVAL = 30_000;
class CloseEvent extends Event {
    constructor(eventInit){
        super("close", eventInit);
    }
}
/** An event which contains information which will be sent to the remote
 * connection and be made available in an `EventSource` as an event. A server
 * creates new events and dispatches them on the target which will then be
 * sent to a client.
 *
 * See more about Server-sent events on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
 *
 * ### Example
 *
 * ```ts
 * import {
 *   ServerSentEvent,
 *   ServerSentEventStreamTarget,
 * } from "https://deno.land/std@$STD_VERSION/http/server_sent_event.ts";
 * import { serve } from "https://deno.land/std@$STD_VERSION/http/server.ts";
 *
 * await serve((request) => {
 *   const target = new ServerSentEventStreamTarget();
 *   const evt = new ServerSentEvent("message", {
 *     data: { hello: "world" },
 *     id: 1
 *   });
 *   target.dispatchEvent(evt);
 *   return target.asResponse();
 * }, { port: 8000 });
 * ```
 */ export class ServerSentEvent extends Event {
    #data;
    #id;
    #type;
    /**
   * @param type the event type that will be available on the client. The type
   *             of `"message"` will be handled specifically as a message
   *             server-side event.
   * @param eventInit initialization options for the event
   */ constructor(type, eventInit = {}){
        super(type, eventInit);
        const { data , replacer , space  } = eventInit;
        this.#type = type;
        try {
            this.#data = typeof data === "string" ? data : JSON.stringify(data, replacer, space);
        } catch (e) {
            assert(e instanceof Error);
            throw new TypeError(`data could not be coerced into a serialized string.\n  ${e.message}`);
        }
        const { id  } = eventInit;
        this.#id = id;
    }
    /** The data associated with the event, which will be sent to the client and
   * be made available in the `EventSource`. */ get data() {
        return this.#data;
    }
    /** The optional ID associated with the event that will be sent to the client
   * and be made available in the `EventSource`. */ get id() {
        return this.#id;
    }
    toString() {
        const data = `data: ${this.#data.split("\n").join("\ndata: ")}\n`;
        return `${this.#type === "__message" ? "" : `event: ${this.#type}\n`}${this.#id ? `id: ${String(this.#id)}\n` : ""}${data}\n`;
    }
}
const RESPONSE_HEADERS = [
    [
        "Connection",
        "Keep-Alive"
    ],
    [
        "Content-Type",
        "text/event-stream"
    ],
    [
        "Cache-Control",
        "no-cache"
    ],
    [
        "Keep-Alive",
        `timeout=${Number.MAX_SAFE_INTEGER}`
    ], 
];
/** An implementation of {@linkcode ServerSentEventTarget} that provides a
 * readable stream as a body of a response to establish a connection to a
 * client. */ export class ServerSentEventStreamTarget extends EventTarget {
    #bodyInit;
    #closed = false;
    #controller;
    // we are ignoring any here, because when exporting to npm/Node.js, the timer
    // handle isn't a number.
    // deno-lint-ignore no-explicit-any
    #keepAliveId;
    // deno-lint-ignore no-explicit-any
    #error(error) {
        this.dispatchEvent(new CloseEvent({
            cancelable: false
        }));
        const errorEvent = new ErrorEvent("error", {
            error
        });
        this.dispatchEvent(errorEvent);
    }
    #push(payload) {
        if (!this.#controller) {
            this.#error(new Error("The controller has not been set."));
            return;
        }
        if (this.#closed) {
            return;
        }
        this.#controller.enqueue(encoder.encode(payload));
    }
    get closed() {
        return this.#closed;
    }
    constructor({ keepAlive =false  } = {}){
        super();
        this.#bodyInit = new ReadableStream({
            start: (controller)=>{
                this.#controller = controller;
            },
            cancel: (error)=>{
                // connections closing are considered "normal" for SSE events and just
                // mean the far side has closed.
                if (error instanceof Error && error.message.includes("connection closed")) {
                    this.close();
                } else {
                    this.#error(error);
                }
            }
        });
        this.addEventListener("close", ()=>{
            this.#closed = true;
            if (this.#keepAliveId != null) {
                clearInterval(this.#keepAliveId);
                this.#keepAliveId = undefined;
            }
            if (this.#controller) {
                try {
                    this.#controller.close();
                } catch  {
                // we ignore any errors here, as it is likely that the controller
                // is already closed
                }
            }
        });
        if (keepAlive) {
            const interval = typeof keepAlive === "number" ? keepAlive : DEFAULT_KEEP_ALIVE_INTERVAL;
            this.#keepAliveId = setInterval(()=>{
                this.dispatchComment("keep-alive comment");
            }, interval);
        }
    }
    /** Returns a {@linkcode Response} which contains the body and headers needed
   * to initiate a SSE connection with the client. */ asResponse(responseInit) {
        return new Response(...this.asResponseInit(responseInit));
    }
    /** Returns a tuple which contains the {@linkcode BodyInit} and
   * {@linkcode ResponseInit} needed to create a response that will establish
   * a SSE connection with the client. */ asResponseInit(responseInit = {}) {
        responseInit.headers = new Headers(responseInit.headers);
        for (const [key, value] of RESPONSE_HEADERS){
            responseInit.headers.set(key, value);
        }
        return [
            this.#bodyInit,
            responseInit
        ];
    }
    close() {
        this.dispatchEvent(new CloseEvent({
            cancelable: false
        }));
        return Promise.resolve();
    }
    dispatchComment(comment) {
        this.#push(`: ${comment.split("\n").join("\n: ")}\n\n`);
        return true;
    }
    // deno-lint-ignore no-explicit-any
    dispatchMessage(data) {
        const event = new ServerSentEvent("__message", {
            data
        });
        return this.dispatchEvent(event);
    }
    dispatchEvent(event) {
        const dispatched = super.dispatchEvent(event);
        if (dispatched && event instanceof ServerSentEvent) {
            this.#push(String(event));
        }
        return dispatched;
    }
    [Symbol.for("Deno.customInspect")](inspect) {
        return `${this.constructor.name} ${inspect({
            "#bodyInit": this.#bodyInit,
            "#closed": this.#closed
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
        return `${options.stylize(this.constructor.name, "special")} ${inspect({
            "#bodyInit": this.#bodyInit,
            "#closed": this.#closed
        }, newOptions)}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvc2VydmVyX3NlbnRfZXZlbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuLyoqXG4gKiBQcm92aWRlcyB7QGxpbmtjb2RlIFNlcnZlclNlbnRFdmVudH0gYW5kXG4gKiB7QGxpbmtjb2RlIFNlcnZlclNlbnRFdmVudFN0cmVhbVRhcmdldH0gd2hpY2ggcHJvdmlkZXMgYW4gaW50ZXJmYWNlIHRvIHNlbmRcbiAqIHNlcnZlciBzZW50IGV2ZW50cyB0byBhIGJyb3dzZXIgdXNpbmcgdGhlIERPTSBldmVudCBtb2RlbC5cbiAqXG4gKiBUaGUge0BsaW5rY29kZSBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXR9IHByb3ZpZGVzIHRoZSBgLmFzUmVzcG9uc2UoKWAgb3JcbiAqIGAuYXNSZXNwb25zZUluaXQoKWAgdG8gcHJvdmlkZSBhIGJvZHkgYW5kIGhlYWRlcnMgdG8gdGhlIGNsaWVudCB0byBlc3RhYmxpc2hcbiAqIHRoZSBldmVudCBjb25uZWN0aW9uLiBUaGlzIGlzIGFjY29tcGxpc2hlZCBieSBrZWVwaW5nIGEgY29ubmVjdGlvbiBvcGVuIHRvXG4gKiB0aGUgY2xpZW50IGJ5IG5vdCBjbG9zaW5nIHRoZSBib2R5LCB3aGljaCBhbGxvd3MgZXZlbnRzIHRvIGJlIHNlbnQgZG93biB0aGVcbiAqIGNvbm5lY3Rpb24gYW5kIHByb2Nlc3NlZCBieSB0aGUgY2xpZW50IGJyb3dzZXIuXG4gKlxuICogU2VlIG1vcmUgYWJvdXQgU2VydmVyLXNlbnQgZXZlbnRzIG9uIFtNRE5dKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9TZXJ2ZXItc2VudF9ldmVudHMvVXNpbmdfc2VydmVyLXNlbnRfZXZlbnRzKVxuICpcbiAqICMjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgU2VydmVyU2VudEV2ZW50LFxuICogICBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQsXG4gKiB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2h0dHAvc2VydmVyX3NlbnRfZXZlbnQudHNcIjtcbiAqIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9zZXJ2ZXIudHNcIjtcbiAqXG4gKiBhd2FpdCBzZXJ2ZSgocmVxdWVzdCkgPT4ge1xuICogICBjb25zdCB0YXJnZXQgPSBuZXcgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0KCk7XG4gKiAgIGxldCBjb3VudGVyID0gMDtcbiAqXG4gKiAgIC8vIFNlbmRzIGFuIGV2ZW50IGV2ZXJ5IDIgc2Vjb25kcywgaW5jcmVtZW50aW5nIHRoZSBJRFxuICogICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAqICAgICBjb25zdCBldnQgPSBuZXcgU2VydmVyU2VudEV2ZW50KFxuICogICAgICAgXCJtZXNzYWdlXCIsXG4gKiAgICAgICB7IGRhdGE6IHsgaGVsbG86IFwid29ybGRcIiB9LCBpZDogY291bnRlcisrIH0sXG4gKiAgICAgKTtcbiAqICAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldnQpO1xuICogICB9LCAyMDAwKTtcbiAqXG4gKiAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICogICByZXR1cm4gdGFyZ2V0LmFzUmVzcG9uc2UoKTtcbiAqIH0sIHsgcG9ydDogODAwMCB9KTtcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vX3V0aWwvYXNzZXJ0cy50c1wiO1xuXG5jb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG5cbmNvbnN0IERFRkFVTFRfS0VFUF9BTElWRV9JTlRFUlZBTCA9IDMwXzAwMDtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJTZW50RXZlbnRJbml0IGV4dGVuZHMgRXZlbnRJbml0IHtcbiAgLyoqIE9wdGlvbmFsIGFyYml0cmFyeSBkYXRhIHRvIHNlbmQgdG8gdGhlIGNsaWVudCwgZGF0YSB0aGlzIGlzIGEgc3RyaW5nIHdpbGxcbiAgICogYmUgc2VudCB1bm1vZGlmaWVkLCBvdGhlcndpc2UgYEpTT04ucGFyc2UoKWAgd2lsbCBiZSB1c2VkIHRvIHNlcmlhbGl6ZSB0aGVcbiAgICogdmFsdWUuICovXG4gIGRhdGE/OiB1bmtub3duO1xuXG4gIC8qKiBBbiBvcHRpb25hbCBgaWRgIHdoaWNoIHdpbGwgYmUgc2VudCB3aXRoIHRoZSBldmVudCBhbmQgZXhwb3NlZCBpbiB0aGVcbiAgICogY2xpZW50IGBFdmVudFNvdXJjZWAuICovXG4gIGlkPzogbnVtYmVyO1xuXG4gIC8qKiBUaGUgcmVwbGFjZXIgaXMgcGFzc2VkIHRvIGBKU09OLnN0cmluZ2lmeWAgd2hlbiBjb252ZXJ0aW5nIHRoZSBgZGF0YWBcbiAgICogcHJvcGVydHkgdG8gYSBKU09OIHN0cmluZy4gKi9cbiAgcmVwbGFjZXI/OlxuICAgIHwgKHN0cmluZyB8IG51bWJlcilbXVxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgfCAoKHRoaXM6IGFueSwga2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+IGFueSk7XG5cbiAgLyoqIFNwYWNlIGlzIHBhc3NlZCB0byBgSlNPTi5zdHJpbmdpZnlgIHdoZW4gY29udmVydGluZyB0aGUgYGRhdGFgIHByb3BlcnR5XG4gICAqIHRvIGEgSlNPTiBzdHJpbmcuICovXG4gIHNwYWNlPzogc3RyaW5nIHwgbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclNlbnRFdmVudFRhcmdldE9wdGlvbnMge1xuICAvKiogS2VlcCBjbGllbnQgY29ubmVjdGlvbnMgYWxpdmUgYnkgc2VuZGluZyBhIGNvbW1lbnQgZXZlbnQgdG8gdGhlIGNsaWVudFxuICAgKiBhdCBhIHNwZWNpZmllZCBpbnRlcnZhbC4gIElmIGB0cnVlYCwgdGhlbiBpdCBwb2xscyBldmVyeSAzMDAwMCBtaWxsaXNlY29uZHNcbiAgICogKDMwIHNlY29uZHMpLiBJZiBzZXQgdG8gYSBudW1iZXIsIHRoZW4gaXQgcG9sbHMgdGhhdCBudW1iZXIgb2ZcbiAgICogbWlsbGlzZWNvbmRzLiAgVGhlIGZlYXR1cmUgaXMgZGlzYWJsZWQgaWYgc2V0IHRvIGBmYWxzZWAuICBJdCBkZWZhdWx0cyB0b1xuICAgKiBgZmFsc2VgLiAqL1xuICBrZWVwQWxpdmU/OiBib29sZWFuIHwgbnVtYmVyO1xufVxuXG5jbGFzcyBDbG9zZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihldmVudEluaXQ6IEV2ZW50SW5pdCkge1xuICAgIHN1cGVyKFwiY2xvc2VcIiwgZXZlbnRJbml0KTtcbiAgfVxufVxuXG4vKiogQW4gZXZlbnQgd2hpY2ggY29udGFpbnMgaW5mb3JtYXRpb24gd2hpY2ggd2lsbCBiZSBzZW50IHRvIHRoZSByZW1vdGVcbiAqIGNvbm5lY3Rpb24gYW5kIGJlIG1hZGUgYXZhaWxhYmxlIGluIGFuIGBFdmVudFNvdXJjZWAgYXMgYW4gZXZlbnQuIEEgc2VydmVyXG4gKiBjcmVhdGVzIG5ldyBldmVudHMgYW5kIGRpc3BhdGNoZXMgdGhlbSBvbiB0aGUgdGFyZ2V0IHdoaWNoIHdpbGwgdGhlbiBiZVxuICogc2VudCB0byBhIGNsaWVudC5cbiAqXG4gKiBTZWUgbW9yZSBhYm91dCBTZXJ2ZXItc2VudCBldmVudHMgb24gW01ETl0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1NlcnZlci1zZW50X2V2ZW50cy9Vc2luZ19zZXJ2ZXItc2VudF9ldmVudHMpXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgU2VydmVyU2VudEV2ZW50LFxuICogICBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQsXG4gKiB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2h0dHAvc2VydmVyX3NlbnRfZXZlbnQudHNcIjtcbiAqIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9zZXJ2ZXIudHNcIjtcbiAqXG4gKiBhd2FpdCBzZXJ2ZSgocmVxdWVzdCkgPT4ge1xuICogICBjb25zdCB0YXJnZXQgPSBuZXcgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0KCk7XG4gKiAgIGNvbnN0IGV2dCA9IG5ldyBTZXJ2ZXJTZW50RXZlbnQoXCJtZXNzYWdlXCIsIHtcbiAqICAgICBkYXRhOiB7IGhlbGxvOiBcIndvcmxkXCIgfSxcbiAqICAgICBpZDogMVxuICogICB9KTtcbiAqICAgdGFyZ2V0LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAqICAgcmV0dXJuIHRhcmdldC5hc1Jlc3BvbnNlKCk7XG4gKiB9LCB7IHBvcnQ6IDgwMDAgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFNlcnZlclNlbnRFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgI2RhdGE6IHN0cmluZztcbiAgI2lkPzogbnVtYmVyO1xuICAjdHlwZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gdHlwZSB0aGUgZXZlbnQgdHlwZSB0aGF0IHdpbGwgYmUgYXZhaWxhYmxlIG9uIHRoZSBjbGllbnQuIFRoZSB0eXBlXG4gICAqICAgICAgICAgICAgIG9mIGBcIm1lc3NhZ2VcImAgd2lsbCBiZSBoYW5kbGVkIHNwZWNpZmljYWxseSBhcyBhIG1lc3NhZ2VcbiAgICogICAgICAgICAgICAgc2VydmVyLXNpZGUgZXZlbnQuXG4gICAqIEBwYXJhbSBldmVudEluaXQgaW5pdGlhbGl6YXRpb24gb3B0aW9ucyBmb3IgdGhlIGV2ZW50XG4gICAqL1xuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIGV2ZW50SW5pdDogU2VydmVyU2VudEV2ZW50SW5pdCA9IHt9KSB7XG4gICAgc3VwZXIodHlwZSwgZXZlbnRJbml0KTtcbiAgICBjb25zdCB7IGRhdGEsIHJlcGxhY2VyLCBzcGFjZSB9ID0gZXZlbnRJbml0O1xuICAgIHRoaXMuI3R5cGUgPSB0eXBlO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLiNkYXRhID0gdHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBkYXRhXG4gICAgICAgIDogSlNPTi5zdHJpbmdpZnkoZGF0YSwgcmVwbGFjZXIgYXMgKHN0cmluZyB8IG51bWJlcilbXSwgc3BhY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFzc2VydChlIGluc3RhbmNlb2YgRXJyb3IpO1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgYGRhdGEgY291bGQgbm90IGJlIGNvZXJjZWQgaW50byBhIHNlcmlhbGl6ZWQgc3RyaW5nLlxcbiAgJHtlLm1lc3NhZ2V9YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHsgaWQgfSA9IGV2ZW50SW5pdDtcbiAgICB0aGlzLiNpZCA9IGlkO1xuICB9XG5cbiAgLyoqIFRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXZlbnQsIHdoaWNoIHdpbGwgYmUgc2VudCB0byB0aGUgY2xpZW50IGFuZFxuICAgKiBiZSBtYWRlIGF2YWlsYWJsZSBpbiB0aGUgYEV2ZW50U291cmNlYC4gKi9cbiAgZ2V0IGRhdGEoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy4jZGF0YTtcbiAgfVxuXG4gIC8qKiBUaGUgb3B0aW9uYWwgSUQgYXNzb2NpYXRlZCB3aXRoIHRoZSBldmVudCB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgY2xpZW50XG4gICAqIGFuZCBiZSBtYWRlIGF2YWlsYWJsZSBpbiB0aGUgYEV2ZW50U291cmNlYC4gKi9cbiAgZ2V0IGlkKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI2lkO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBkYXRhID0gYGRhdGE6ICR7dGhpcy4jZGF0YS5zcGxpdChcIlxcblwiKS5qb2luKFwiXFxuZGF0YTogXCIpfVxcbmA7XG4gICAgcmV0dXJuIGAke3RoaXMuI3R5cGUgPT09IFwiX19tZXNzYWdlXCIgPyBcIlwiIDogYGV2ZW50OiAke3RoaXMuI3R5cGV9XFxuYH0ke1xuICAgICAgdGhpcy4jaWQgPyBgaWQ6ICR7U3RyaW5nKHRoaXMuI2lkKX1cXG5gIDogXCJcIlxuICAgIH0ke2RhdGF9XFxuYDtcbiAgfVxufVxuXG5jb25zdCBSRVNQT05TRV9IRUFERVJTID0gW1xuICBbXCJDb25uZWN0aW9uXCIsIFwiS2VlcC1BbGl2ZVwiXSxcbiAgW1wiQ29udGVudC1UeXBlXCIsIFwidGV4dC9ldmVudC1zdHJlYW1cIl0sXG4gIFtcIkNhY2hlLUNvbnRyb2xcIiwgXCJuby1jYWNoZVwiXSxcbiAgW1wiS2VlcC1BbGl2ZVwiLCBgdGltZW91dD0ke051bWJlci5NQVhfU0FGRV9JTlRFR0VSfWBdLFxuXSBhcyBjb25zdDtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXQgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gIC8qKiBJcyBzZXQgdG8gYHRydWVgIGlmIGV2ZW50cyBjYW5ub3QgYmUgc2VudCB0byB0aGUgcmVtb3RlIGNvbm5lY3Rpb24uXG4gICAqIE90aGVyd2lzZSBpdCBpcyBzZXQgdG8gYGZhbHNlYC5cbiAgICpcbiAgICogKk5vdGUqOiBUaGlzIGZsYWcgaXMgbGF6aWx5IHNldCwgYW5kIG1pZ2h0IG5vdCByZWZsZWN0IGEgY2xvc2VkIHN0YXRlIHVudGlsXG4gICAqIGFub3RoZXIgZXZlbnQsIGNvbW1lbnQgb3IgbWVzc2FnZSBpcyBhdHRlbXB0ZWQgdG8gYmUgcHJvY2Vzc2VkLiAqL1xuICByZWFkb25seSBjbG9zZWQ6IGJvb2xlYW47XG5cbiAgLyoqIENsb3NlIHRoZSB0YXJnZXQsIHJlZnVzaW5nIHRvIGFjY2VwdCBhbnkgbW9yZSBldmVudHMuICovXG4gIGNsb3NlKCk6IFByb21pc2U8dm9pZD47XG5cbiAgLyoqIFNlbmQgYSBjb21tZW50IHRvIHRoZSByZW1vdGUgY29ubmVjdGlvbi4gIENvbW1lbnRzIGFyZSBub3QgZXhwb3NlZCB0byB0aGVcbiAgICogY2xpZW50IGBFdmVudFNvdXJjZWAgYnV0IGFyZSB1c2VkIGZvciBkaWFnbm9zdGljcyBhbmQgaGVscGluZyBlbnN1cmUgYVxuICAgKiBjb25uZWN0aW9uIGlzIGtlcHQgYWxpdmUuXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IFNlcnZlclNlbnRFdmVudFN0cmVhbVRhcmdldCB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2h0dHAvc2VydmVyX3NlbnRfZXZlbnQudHNcIjtcbiAgICogaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL3NlcnZlci50c1wiO1xuICAgKlxuICAgKiBhd2FpdCBzZXJ2ZSgocmVxdWVzdCkgPT4ge1xuICAgKiAgIGNvbnN0IHRhcmdldCA9IG5ldyBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQoKTtcbiAgICogICB0YXJnZXQuZGlzcGF0Y2hDb21tZW50KFwidGhpcyBpcyBhIGNvbW1lbnRcIik7XG4gICAqICAgcmV0dXJuIHRhcmdldC5hc1Jlc3BvbnNlKCk7XG4gICAqIH0sIHsgcG9ydDogODAwMCB9KTtcbiAgICogYGBgXG4gICAqL1xuICBkaXNwYXRjaENvbW1lbnQoY29tbWVudDogc3RyaW5nKTogYm9vbGVhbjtcblxuICAvKiogRGlzcGF0Y2ggYSBtZXNzYWdlIHRvIHRoZSBjbGllbnQuICBUaGlzIG1lc3NhZ2Ugd2lsbCBjb250YWluIGBkYXRhOiBgIG9ubHlcbiAgICogYW5kIGJlIGF2YWlsYWJsZSBvbiB0aGUgY2xpZW50IGBFdmVudFNvdXJjZWAgb24gdGhlIGBvbm1lc3NhZ2VgIG9yIGFuIGV2ZW50XG4gICAqIGxpc3RlbmVyIG9mIHR5cGUgYFwibWVzc2FnZVwiYC4gKi9cbiAgZGlzcGF0Y2hNZXNzYWdlKGRhdGE6IHVua25vd24pOiBib29sZWFuO1xuXG4gIC8qKiBEaXNwYXRjaCBhIHNlcnZlciBzZW50IGV2ZW50IHRvIHRoZSBjbGllbnQuICBUaGUgZXZlbnQgYHR5cGVgIHdpbGwgYmVcbiAgICogc2VudCBhcyBgZXZlbnQ6IGAgdG8gdGhlIGNsaWVudCB3aGljaCB3aWxsIGJlIHJhaXNlZCBhcyBhIGBNZXNzYWdlRXZlbnRgXG4gICAqIG9uIHRoZSBgRXZlbnRTb3VyY2VgIGluIHRoZSBjbGllbnQuXG4gICAqXG4gICAqIEFueSBsb2NhbCBldmVudCBoYW5kbGVycyB3aWxsIGJlIGRpc3BhdGNoZWQgdG8gZmlyc3QsIGFuZCBpZiB0aGUgZXZlbnRcbiAgICogaXMgY2FuY2VsbGVkLCBpdCB3aWxsIG5vdCBiZSBzZW50IHRvIHRoZSBjbGllbnQuXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7XG4gICAqICAgU2VydmVyU2VudEV2ZW50LFxuICAgKiAgIFNlcnZlclNlbnRFdmVudFN0cmVhbVRhcmdldCxcbiAgICogfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL3NlcnZlcl9zZW50X2V2ZW50LnRzXCI7XG4gICAqIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9zZXJ2ZXIudHNcIjtcbiAgICpcbiAgICogYXdhaXQgc2VydmUoKHJlcXVlc3QpID0+IHtcbiAgICogICBjb25zdCB0YXJnZXQgPSBuZXcgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0KCk7XG4gICAqICAgY29uc3QgZXZ0ID0gbmV3IFNlcnZlclNlbnRFdmVudChcInBpbmdcIiwgeyBkYXRhOiBcImhlbGxvXCIgfSk7XG4gICAqICAgdGFyZ2V0LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICogICByZXR1cm4gdGFyZ2V0LmFzUmVzcG9uc2UoKTtcbiAgICogfSwgeyBwb3J0OiA4MDAwIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRpc3BhdGNoRXZlbnQoZXZlbnQ6IFNlcnZlclNlbnRFdmVudCk6IGJvb2xlYW47XG5cbiAgLyoqIERpc3BhdGNoIGEgc2VydmVyIHNlbnQgZXZlbnQgdG8gdGhlIGNsaWVudC4gIFRoZSBldmVudCBgdHlwZWAgd2lsbCBiZVxuICAgKiBzZW50IGFzIGBldmVudDogYCB0byB0aGUgY2xpZW50IHdoaWNoIHdpbGwgYmUgcmFpc2VkIGFzIGEgYE1lc3NhZ2VFdmVudGBcbiAgICogb24gdGhlIGBFdmVudFNvdXJjZWAgaW4gdGhlIGNsaWVudC5cbiAgICpcbiAgICogQW55IGxvY2FsIGV2ZW50IGhhbmRsZXJzIHdpbGwgYmUgZGlzcGF0Y2hlZCB0byBmaXJzdCwgYW5kIGlmIHRoZSBldmVudFxuICAgKiBpcyBjYW5jZWxsZWQsIGl0IHdpbGwgbm90IGJlIHNlbnQgdG8gdGhlIGNsaWVudC5cbiAgICpcbiAgICogYGBgdHNcbiAgICogaW1wb3J0IHtcbiAgICogICBTZXJ2ZXJTZW50RXZlbnQsXG4gICAqICAgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0LFxuICAgKiB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL2h0dHAvc2VydmVyX3NlbnRfZXZlbnQudHNcIjtcbiAgICogaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi9odHRwL3NlcnZlci50c1wiO1xuICAgKlxuICAgKiBhd2FpdCBzZXJ2ZSgocmVxdWVzdCkgPT4ge1xuICAgKiAgIGNvbnN0IHRhcmdldCA9IG5ldyBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQoKTtcbiAgICogICBjb25zdCBldnQgPSBuZXcgU2VydmVyU2VudEV2ZW50KFwicGluZ1wiLCB7IGRhdGE6IFwiaGVsbG9cIiB9KTtcbiAgICogICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldnQpO1xuICAgKiAgIHJldHVybiB0YXJnZXQuYXNSZXNwb25zZSgpO1xuICAgKiB9LCB7IHBvcnQ6IDgwMDAgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGlzcGF0Y2hFdmVudChldmVudDogQ2xvc2VFdmVudCB8IEVycm9yRXZlbnQpOiBib29sZWFuO1xufVxuXG4vKiogQW4gaW1wbGVtZW50YXRpb24gb2Yge0BsaW5rY29kZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXR9IHRoYXQgcHJvdmlkZXMgYVxuICogcmVhZGFibGUgc3RyZWFtIGFzIGEgYm9keSBvZiBhIHJlc3BvbnNlIHRvIGVzdGFibGlzaCBhIGNvbm5lY3Rpb24gdG8gYVxuICogY2xpZW50LiAqL1xuZXhwb3J0IGNsYXNzIFNlcnZlclNlbnRFdmVudFN0cmVhbVRhcmdldCBleHRlbmRzIEV2ZW50VGFyZ2V0XG4gIGltcGxlbWVudHMgU2VydmVyU2VudEV2ZW50VGFyZ2V0IHtcbiAgI2JvZHlJbml0OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PjtcbiAgI2Nsb3NlZCA9IGZhbHNlO1xuICAjY29udHJvbGxlcj86IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT47XG4gIC8vIHdlIGFyZSBpZ25vcmluZyBhbnkgaGVyZSwgYmVjYXVzZSB3aGVuIGV4cG9ydGluZyB0byBucG0vTm9kZS5qcywgdGhlIHRpbWVyXG4gIC8vIGhhbmRsZSBpc24ndCBhIG51bWJlci5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgI2tlZXBBbGl2ZUlkPzogYW55O1xuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICNlcnJvcihlcnJvcjogYW55KSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDbG9zZUV2ZW50KHsgY2FuY2VsYWJsZTogZmFsc2UgfSkpO1xuICAgIGNvbnN0IGVycm9yRXZlbnQgPSBuZXcgRXJyb3JFdmVudChcImVycm9yXCIsIHsgZXJyb3IgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGVycm9yRXZlbnQpO1xuICB9XG5cbiAgI3B1c2gocGF5bG9hZDogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLiNjb250cm9sbGVyKSB7XG4gICAgICB0aGlzLiNlcnJvcihuZXcgRXJyb3IoXCJUaGUgY29udHJvbGxlciBoYXMgbm90IGJlZW4gc2V0LlwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLiNjbG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy4jY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKHBheWxvYWQpKTtcbiAgfVxuXG4gIGdldCBjbG9zZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2Nsb3NlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHsga2VlcEFsaXZlID0gZmFsc2UgfTogU2VydmVyU2VudEV2ZW50VGFyZ2V0T3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuI2JvZHlJbml0ID0gbmV3IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+KHtcbiAgICAgIHN0YXJ0OiAoY29udHJvbGxlcikgPT4ge1xuICAgICAgICB0aGlzLiNjb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgICAgIH0sXG4gICAgICBjYW5jZWw6IChlcnJvcikgPT4ge1xuICAgICAgICAvLyBjb25uZWN0aW9ucyBjbG9zaW5nIGFyZSBjb25zaWRlcmVkIFwibm9ybWFsXCIgZm9yIFNTRSBldmVudHMgYW5kIGp1c3RcbiAgICAgICAgLy8gbWVhbiB0aGUgZmFyIHNpZGUgaGFzIGNsb3NlZC5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyb3IubWVzc2FnZS5pbmNsdWRlcyhcImNvbm5lY3Rpb24gY2xvc2VkXCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLiNlcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCAoKSA9PiB7XG4gICAgICB0aGlzLiNjbG9zZWQgPSB0cnVlO1xuICAgICAgaWYgKHRoaXMuI2tlZXBBbGl2ZUlkICE9IG51bGwpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLiNrZWVwQWxpdmVJZCk7XG4gICAgICAgIHRoaXMuI2tlZXBBbGl2ZUlkID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuI2NvbnRyb2xsZXIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLiNjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHdlIGlnbm9yZSBhbnkgZXJyb3JzIGhlcmUsIGFzIGl0IGlzIGxpa2VseSB0aGF0IHRoZSBjb250cm9sbGVyXG4gICAgICAgICAgLy8gaXMgYWxyZWFkeSBjbG9zZWRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGtlZXBBbGl2ZSkge1xuICAgICAgY29uc3QgaW50ZXJ2YWwgPSB0eXBlb2Yga2VlcEFsaXZlID09PSBcIm51bWJlclwiXG4gICAgICAgID8ga2VlcEFsaXZlXG4gICAgICAgIDogREVGQVVMVF9LRUVQX0FMSVZFX0lOVEVSVkFMO1xuICAgICAgdGhpcy4ja2VlcEFsaXZlSWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hDb21tZW50KFwia2VlcC1hbGl2ZSBjb21tZW50XCIpO1xuICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGEge0BsaW5rY29kZSBSZXNwb25zZX0gd2hpY2ggY29udGFpbnMgdGhlIGJvZHkgYW5kIGhlYWRlcnMgbmVlZGVkXG4gICAqIHRvIGluaXRpYXRlIGEgU1NFIGNvbm5lY3Rpb24gd2l0aCB0aGUgY2xpZW50LiAqL1xuICBhc1Jlc3BvbnNlKHJlc3BvbnNlSW5pdD86IFJlc3BvbnNlSW5pdCk6IFJlc3BvbnNlIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKC4uLnRoaXMuYXNSZXNwb25zZUluaXQocmVzcG9uc2VJbml0KSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIHR1cGxlIHdoaWNoIGNvbnRhaW5zIHRoZSB7QGxpbmtjb2RlIEJvZHlJbml0fSBhbmRcbiAgICoge0BsaW5rY29kZSBSZXNwb25zZUluaXR9IG5lZWRlZCB0byBjcmVhdGUgYSByZXNwb25zZSB0aGF0IHdpbGwgZXN0YWJsaXNoXG4gICAqIGEgU1NFIGNvbm5lY3Rpb24gd2l0aCB0aGUgY2xpZW50LiAqL1xuICBhc1Jlc3BvbnNlSW5pdChyZXNwb25zZUluaXQ6IFJlc3BvbnNlSW5pdCA9IHt9KTogW0JvZHlJbml0LCBSZXNwb25zZUluaXRdIHtcbiAgICByZXNwb25zZUluaXQuaGVhZGVycyA9IG5ldyBIZWFkZXJzKHJlc3BvbnNlSW5pdC5oZWFkZXJzKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBSRVNQT05TRV9IRUFERVJTKSB7XG4gICAgICByZXNwb25zZUluaXQuaGVhZGVycy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBbdGhpcy4jYm9keUluaXQsIHJlc3BvbnNlSW5pdF07XG4gIH1cblxuICBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IENsb3NlRXZlbnQoeyBjYW5jZWxhYmxlOiBmYWxzZSB9KSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgZGlzcGF0Y2hDb21tZW50KGNvbW1lbnQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRoaXMuI3B1c2goYDogJHtjb21tZW50LnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG46IFwiKX1cXG5cXG5gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGRpc3BhdGNoTWVzc2FnZShkYXRhOiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBldmVudCA9IG5ldyBTZXJ2ZXJTZW50RXZlbnQoXCJfX21lc3NhZ2VcIiwgeyBkYXRhIH0pO1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzcGF0Y2hFdmVudChldmVudDogU2VydmVyU2VudEV2ZW50KTogYm9vbGVhbjtcbiAgb3ZlcnJpZGUgZGlzcGF0Y2hFdmVudChldmVudDogQ2xvc2VFdmVudCB8IEVycm9yRXZlbnQpOiBib29sZWFuO1xuICBvdmVycmlkZSBkaXNwYXRjaEV2ZW50KFxuICAgIGV2ZW50OiBTZXJ2ZXJTZW50RXZlbnQgfCBDbG9zZUV2ZW50IHwgRXJyb3JFdmVudCxcbiAgKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZGlzcGF0Y2hlZCA9IHN1cGVyLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIGlmIChkaXNwYXRjaGVkICYmIGV2ZW50IGluc3RhbmNlb2YgU2VydmVyU2VudEV2ZW50KSB7XG4gICAgICB0aGlzLiNwdXNoKFN0cmluZyhldmVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGlzcGF0Y2hlZDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZykge1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHsgXCIjYm9keUluaXRcIjogdGhpcy4jYm9keUluaXQsIFwiI2Nsb3NlZFwiOiB0aGlzLiNjbG9zZWQgfSlcbiAgICB9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICApIHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3QoXG4gICAgICAgIHsgXCIjYm9keUluaXRcIjogdGhpcy4jYm9keUluaXQsIFwiI2Nsb3NlZFwiOiB0aGlzLiNjbG9zZWQgfSxcbiAgICAgICAgbmV3T3B0aW9ucyxcbiAgICAgIClcbiAgICB9YDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBeUNDLEdBRUQsU0FBUyxNQUFNLFFBQVEscUJBQXFCLENBQUM7QUFFN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQUFBQztBQUVsQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQUFBQztBQWlDM0MsTUFBTSxVQUFVLFNBQVMsS0FBSztJQUM1QixZQUFZLFNBQW9CLENBQUU7UUFDaEMs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