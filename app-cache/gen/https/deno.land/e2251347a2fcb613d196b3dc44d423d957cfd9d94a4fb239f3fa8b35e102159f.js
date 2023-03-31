#!/usr/bin/env -S deno run --allow-net --allow-read
// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This program serves files in the current directory over HTTP.
// TODO(bartlomieju): Add tests like these:
// https://github.com/indexzero/http-server/blob/master/test/http-server-test.js
import { extname, posix } from "../path/mod.ts";
import { contentType } from "../media_types/content_type.ts";
import { serve, serveTls } from "./server.ts";
import { Status } from "./http_status.ts";
import { parse } from "../flags/mod.ts";
import { assert } from "../_util/asserts.ts";
import { red } from "../fmt/colors.ts";
import { compareEtag, createCommonResponse } from "./util.ts";
import { toHashString } from "../crypto/to_hash_string.ts";
import { createHash } from "../crypto/_util.ts";
import { VERSION } from "../version.ts";
const encoder = new TextEncoder();
// avoid top-lebvel-await
const envPermissionStatus = Deno.permissions.querySync?.({
    name: "env",
    variable: "DENO_DEPLOYMENT_ID"
}).state ?? "granted"; // for deno deploy
const DENO_DEPLOYMENT_ID = envPermissionStatus === "granted" ? Deno.env.get("DENO_DEPLOYMENT_ID") : undefined;
const hashedDenoDeploymentId = DENO_DEPLOYMENT_ID ? createHash("FNV32A", DENO_DEPLOYMENT_ID).then((hash)=>toHashString(hash)) : undefined;
function modeToString(isDir, maybeMode) {
    const modeMap = [
        "---",
        "--x",
        "-w-",
        "-wx",
        "r--",
        "r-x",
        "rw-",
        "rwx"
    ];
    if (maybeMode === null) {
        return "(unknown mode)";
    }
    const mode = maybeMode.toString(8);
    if (mode.length < 3) {
        return "(unknown mode)";
    }
    let output = "";
    mode.split("").reverse().slice(0, 3).forEach((v)=>{
        output = `${modeMap[+v]} ${output}`;
    });
    output = `${isDir ? "d" : "-"} ${output}`;
    return output;
}
function fileLenToString(len) {
    const multiplier = 1024;
    let base = 1;
    const suffix = [
        "B",
        "K",
        "M",
        "G",
        "T"
    ];
    let suffixIndex = 0;
    while(base * multiplier < len){
        if (suffixIndex >= suffix.length - 1) {
            break;
        }
        base *= multiplier;
        suffixIndex++;
    }
    return `${(len / base).toFixed(2)}${suffix[suffixIndex]}`;
}
/**
 * Returns an HTTP Response with the requested file as the body.
 * @param req The server request context used to cleanup the file handle.
 * @param filePath Path of the file to serve.
 */ export async function serveFile(req, filePath, { etagAlgorithm , fileInfo  } = {}) {
    try {
        fileInfo ??= await Deno.stat(filePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            await req.body?.cancel();
            return createCommonResponse(Status.NotFound);
        } else {
            throw error;
        }
    }
    if (fileInfo.isDirectory) {
        await req.body?.cancel();
        return createCommonResponse(Status.NotFound);
    }
    const file = await Deno.open(filePath);
    const headers = setBaseHeaders();
    // Set mime-type using the file extension in filePath
    const contentTypeValue = contentType(extname(filePath));
    if (contentTypeValue) {
        headers.set("content-type", contentTypeValue);
    }
    // Set date header if access timestamp is available
    if (fileInfo.atime instanceof Date) {
        const date = new Date(fileInfo.atime);
        headers.set("date", date.toUTCString());
    }
    // Create a simple etag that is an md5 of the last modified date and filesize concatenated
    const etag = fileInfo.mtime ? toHashString(await createHash(etagAlgorithm ?? "FNV32A", `${fileInfo.mtime.toJSON()}${fileInfo.size}`)) : await hashedDenoDeploymentId;
    // Set last modified header if last modification timestamp is available
    if (fileInfo.mtime) {
        headers.set("last-modified", fileInfo.mtime.toUTCString());
    }
    if (etag) {
        headers.set("etag", etag);
    }
    if (etag || fileInfo.mtime) {
        // If a `if-none-match` header is present and the value matches the tag or
        // if a `if-modified-since` header is present and the value is bigger than
        // the access timestamp value, then return 304
        const ifNoneMatch = req.headers.get("if-none-match");
        const ifModifiedSince = req.headers.get("if-modified-since");
        if (etag && ifNoneMatch && compareEtag(ifNoneMatch, etag) || ifNoneMatch === null && fileInfo.mtime && ifModifiedSince && fileInfo.mtime.getTime() < new Date(ifModifiedSince).getTime() + 1000) {
            file.close();
            return createCommonResponse(Status.NotModified, null, {
                headers
            });
        }
    }
    // Get and parse the "range" header
    const range = req.headers.get("range");
    const rangeRe = /bytes=(\d+)-(\d+)?/;
    const parsed = rangeRe.exec(range);
    // Use the parsed value if available, fallback to the start and end of the entire file
    const start = parsed && parsed[1] ? +parsed[1] : 0;
    const end = parsed && parsed[2] ? +parsed[2] : fileInfo.size - 1;
    // If there is a range, set the status to 206, and set the "Content-range" header.
    if (range && parsed) {
        headers.set("content-range", `bytes ${start}-${end}/${fileInfo.size}`);
    }
    // Return 416 if `start` isn't less than or equal to `end`, or `start` or `end` are greater than the file's size
    const maxRange = fileInfo.size - 1;
    if (range && (!parsed || typeof start !== "number" || start > end || start > maxRange || end > maxRange)) {
        file.close();
        return createCommonResponse(Status.RequestedRangeNotSatisfiable, undefined, {
            headers
        });
    }
    // Set content length
    const contentLength = end - start + 1;
    headers.set("content-length", `${contentLength}`);
    if (range && parsed) {
        await file.seek(start, Deno.SeekMode.Start);
        return createCommonResponse(Status.PartialContent, file.readable, {
            headers
        });
    }
    return createCommonResponse(Status.OK, file.readable, {
        headers
    });
}
// TODO(bartlomieju): simplify this after deno.stat and deno.readDir are fixed
async function serveDirIndex(dirPath, options) {
    const showDotfiles = options.dotfiles;
    const dirUrl = `/${posix.relative(options.target, dirPath)}`;
    const listEntry = [];
    // if ".." makes sense
    if (dirUrl !== "/") {
        const prevPath = posix.join(dirPath, "..");
        const fileInfo = await Deno.stat(prevPath);
        listEntry.push({
            mode: modeToString(true, fileInfo.mode),
            size: "",
            name: "../",
            url: posix.join(dirUrl, "..")
        });
    }
    for await (const entry of Deno.readDir(dirPath)){
        if (!showDotfiles && entry.name[0] === ".") {
            continue;
        }
        const filePath = posix.join(dirPath, entry.name);
        const fileUrl = encodeURIComponent(posix.join(dirUrl, entry.name)).replaceAll("%2F", "/");
        const fileInfo1 = await Deno.stat(filePath);
        listEntry.push({
            mode: modeToString(entry.isDirectory, fileInfo1.mode),
            size: entry.isFile ? fileLenToString(fileInfo1.size ?? 0) : "",
            name: `${entry.name}${entry.isDirectory ? "/" : ""}`,
            url: `${fileUrl}${entry.isDirectory ? "/" : ""}`
        });
    }
    listEntry.sort((a, b)=>a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
    const formattedDirUrl = `${dirUrl.replace(/\/$/, "")}/`;
    const page = encoder.encode(dirViewerTemplate(formattedDirUrl, listEntry));
    const headers = setBaseHeaders();
    headers.set("content-type", "text/html");
    return createCommonResponse(Status.OK, page, {
        headers
    });
}
function serveFallback(_req, e) {
    if (e instanceof URIError) {
        return Promise.resolve(createCommonResponse(Status.BadRequest));
    } else if (e instanceof Deno.errors.NotFound) {
        return Promise.resolve(createCommonResponse(Status.NotFound));
    }
    return Promise.resolve(createCommonResponse(Status.InternalServerError));
}
function serverLog(req, status) {
    const d = new Date().toISOString();
    const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
    const normalizedUrl = normalizeURL(req.url);
    const s = `${dateFmt} [${req.method}] ${normalizedUrl} ${status}`;
    // using console.debug instead of console.log so chrome inspect users can hide request logs
    console.debug(s);
}
function setBaseHeaders() {
    const headers = new Headers();
    headers.set("server", "deno");
    // Set "accept-ranges" so that the client knows it can make range requests on future requests
    headers.set("accept-ranges", "bytes");
    headers.set("date", new Date().toUTCString());
    return headers;
}
function dirViewerTemplate(dirname, entries) {
    const paths = dirname.split("/");
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Deno File Server</title>
        <style>
          :root {
            --background-color: #fafafa;
            --color: rgba(0, 0, 0, 0.87);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --background-color: #292929;
              --color: #fff;
            }
            thead {
              color: #7f7f7f;
            }
          }
          @media (min-width: 960px) {
            main {
              max-width: 960px;
            }
            body {
              padding-left: 32px;
              padding-right: 32px;
            }
          }
          @media (min-width: 600px) {
            main {
              padding-left: 24px;
              padding-right: 24px;
            }
          }
          body {
            background: var(--background-color);
            color: var(--color);
            font-family: "Roboto", "Helvetica", "Arial", sans-serif;
            font-weight: 400;
            line-height: 1.43;
            font-size: 0.875rem;
          }
          a {
            color: #2196f3;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          thead {
            text-align: left;
          }
          thead th {
            padding-bottom: 12px;
          }
          table td {
            padding: 6px 36px 6px 0px;
          }
          .size {
            text-align: right;
            padding: 6px 12px 6px 24px;
          }
          .mode {
            font-family: monospace, monospace;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Index of
          <a href="/">home</a>${paths.map((path, index, array)=>{
        if (path === "") return "";
        const link = array.slice(0, index + 1).join("/");
        return `<a href="${link}">${path}</a>`;
    }).join("/")}
          </h1>
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>Size</th>
                <th>Name</th>
              </tr>
            </thead>
            ${entries.map((entry)=>`
                  <tr>
                    <td class="mode">
                      ${entry.mode}
                    </td>
                    <td class="size">
                      ${entry.size}
                    </td>
                    <td>
                      <a href="${entry.url}">${entry.name}</a>
                    </td>
                  </tr>
                `).join("")}
          </table>
        </main>
      </body>
    </html>
  `;
}
/**
 * Serves the files under the given directory root (opts.fsRoot).
 *
 * ```ts
 * import { serve } from "https://deno.land/std@$STD_VERSION/http/server.ts";
 * import { serveDir } from "https://deno.land/std@$STD_VERSION/http/file_server.ts";
 *
 * serve((req) => {
 *   const pathname = new URL(req.url).pathname;
 *   if (pathname.startsWith("/static")) {
 *     return serveDir(req, {
 *       fsRoot: "path/to/static/files/dir",
 *     });
 *   }
 *   // Do dynamic responses
 *   return new Response();
 * });
 * ```
 *
 * Optionally you can pass `urlRoot` option. If it's specified that part is stripped from the beginning of the requested pathname.
 *
 * ```ts
 * import { serveDir } from "https://deno.land/std@$STD_VERSION/http/file_server.ts";
 *
 * // ...
 * serveDir(new Request("http://localhost/static/path/to/file"), {
 *   fsRoot: "public",
 *   urlRoot: "static",
 * });
 * ```
 *
 * The above example serves `./public/path/to/file` for the request to `/static/path/to/file`.
 *
 * @param req The request to handle
 */ export async function serveDir(req, opts = {}) {
    let response = undefined;
    const target = opts.fsRoot || ".";
    const urlRoot = opts.urlRoot;
    const showIndex = opts.showIndex ?? true;
    try {
        let normalizedPath = normalizeURL(req.url);
        if (urlRoot) {
            if (normalizedPath.startsWith("/" + urlRoot)) {
                normalizedPath = normalizedPath.replace(urlRoot, "");
            } else {
                throw new Deno.errors.NotFound();
            }
        }
        const fsPath = posix.join(target, normalizedPath);
        const fileInfo = await Deno.stat(fsPath);
        if (fileInfo.isDirectory) {
            if (showIndex) {
                try {
                    const path = posix.join(fsPath, "index.html");
                    const indexFileInfo = await Deno.lstat(path);
                    if (indexFileInfo.isFile) {
                        // If the current URL's pathname doesn't end with a slash, any
                        // relative URLs in the index file will resolve against the parent
                        // directory, rather than the current directory. To prevent that, we
                        // return a 301 redirect to the URL with a slash.
                        if (!fsPath.endsWith("/")) {
                            const url = new URL(req.url);
                            url.pathname += "/";
                            return Response.redirect(url, 301);
                        }
                        response = await serveFile(req, path, {
                            etagAlgorithm: opts.etagAlgorithm,
                            fileInfo: indexFileInfo
                        });
                    }
                } catch (e) {
                    if (!(e instanceof Deno.errors.NotFound)) {
                        throw e;
                    }
                // pass
                }
            }
            if (!response && opts.showDirListing) {
                response = await serveDirIndex(fsPath, {
                    dotfiles: opts.showDotfiles || false,
                    target
                });
            }
            if (!response) {
                throw new Deno.errors.NotFound();
            }
        } else {
            response = await serveFile(req, fsPath, {
                etagAlgorithm: opts.etagAlgorithm,
                fileInfo
            });
        }
    } catch (e1) {
        const err = e1 instanceof Error ? e1 : new Error("[non-error thrown]");
        if (!opts.quiet) console.error(red(err.message));
        response = await serveFallback(req, err);
    }
    if (opts.enableCors) {
        assert(response);
        response.headers.append("access-control-allow-origin", "*");
        response.headers.append("access-control-allow-headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
    }
    if (!opts.quiet) serverLog(req, response.status);
    if (opts.headers) {
        for (const header of opts.headers){
            const headerSplit = header.split(":");
            const name = headerSplit[0];
            const value = headerSplit.slice(1).join(":");
            response.headers.append(name, value);
        }
    }
    return response;
}
function normalizeURL(url) {
    return posix.normalize(decodeURIComponent(new URL(url).pathname));
}
function main() {
    const serverArgs = parse(Deno.args, {
        string: [
            "port",
            "host",
            "cert",
            "key",
            "header"
        ],
        boolean: [
            "help",
            "dir-listing",
            "dotfiles",
            "cors",
            "verbose",
            "version"
        ],
        negatable: [
            "dir-listing",
            "dotfiles",
            "cors"
        ],
        collect: [
            "header"
        ],
        default: {
            "dir-listing": true,
            dotfiles: true,
            cors: true,
            verbose: false,
            version: false,
            host: "0.0.0.0",
            port: "4507",
            cert: "",
            key: ""
        },
        alias: {
            p: "port",
            c: "cert",
            k: "key",
            h: "help",
            v: "verbose",
            V: "version",
            H: "header"
        }
    });
    const port = Number(serverArgs.port);
    const headers = serverArgs.header || [];
    const host = serverArgs.host;
    const certFile = serverArgs.cert;
    const keyFile = serverArgs.key;
    if (serverArgs.help) {
        printUsage();
        Deno.exit();
    }
    if (serverArgs.version) {
        console.log(`Deno File Server ${VERSION}`);
        Deno.exit();
    }
    if (keyFile || certFile) {
        if (keyFile === "" || certFile === "") {
            console.log("--key and --cert are required for TLS");
            printUsage();
            Deno.exit(1);
        }
    }
    const wild = serverArgs._;
    const target = posix.resolve(wild[0] ?? "");
    const handler = (req)=>{
        return serveDir(req, {
            fsRoot: target,
            showDirListing: serverArgs["dir-listing"],
            showDotfiles: serverArgs.dotfiles,
            enableCors: serverArgs.cors,
            quiet: !serverArgs.verbose,
            headers
        });
    };
    const useTls = !!(keyFile && certFile);
    if (useTls) {
        serveTls(handler, {
            port,
            hostname: host,
            certFile,
            keyFile
        });
    } else {
        serve(handler, {
            port,
            hostname: host
        });
    }
}
function printUsage() {
    console.log(`Deno File Server ${VERSION}
  Serves a local directory in HTTP.

INSTALL:
  deno install --allow-net --allow-read https://deno.land/std/http/file_server.ts

USAGE:
  file_server [path] [options]

OPTIONS:
  -h, --help            Prints help information
  -p, --port <PORT>     Set port
  --cors                Enable CORS via the "Access-Control-Allow-Origin" header
  --host     <HOST>     Hostname (default is 0.0.0.0)
  -c, --cert <FILE>     TLS certificate file (enables TLS)
  -k, --key  <FILE>     TLS key file (enables TLS)
  -H, --header <HEADER> Sets a header on every request.
                        (e.g. --header "Cache-Control: no-cache")
                        This option can be specified multiple times.
  --no-dir-listing      Disable directory listing
  --no-dotfiles         Do not show dotfiles
  --no-cors             Disable cross-origin resource sharing
  -v, --verbose         Print request level logs
  -V, --version         Print version information

  All TLS options are required when one is provided.`);
}
if (import.meta.main) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvZmlsZV9zZXJ2ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgLVMgZGVubyBydW4gLS1hbGxvdy1uZXQgLS1hbGxvdy1yZWFkXG4vLyBDb3B5cmlnaHQgMjAxOC0yMDIzIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vLyBUaGlzIHByb2dyYW0gc2VydmVzIGZpbGVzIGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBvdmVyIEhUVFAuXG4vLyBUT0RPKGJhcnRsb21pZWp1KTogQWRkIHRlc3RzIGxpa2UgdGhlc2U6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vaW5kZXh6ZXJvL2h0dHAtc2VydmVyL2Jsb2IvbWFzdGVyL3Rlc3QvaHR0cC1zZXJ2ZXItdGVzdC5qc1xuXG5pbXBvcnQgeyBleHRuYW1lLCBwb3NpeCB9IGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuaW1wb3J0IHsgY29udGVudFR5cGUgfSBmcm9tIFwiLi4vbWVkaWFfdHlwZXMvY29udGVudF90eXBlLnRzXCI7XG5pbXBvcnQgeyBzZXJ2ZSwgc2VydmVUbHMgfSBmcm9tIFwiLi9zZXJ2ZXIudHNcIjtcbmltcG9ydCB7IFN0YXR1cyB9IGZyb20gXCIuL2h0dHBfc3RhdHVzLnRzXCI7XG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gXCIuLi9mbGFncy9tb2QudHNcIjtcbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnRzLnRzXCI7XG5pbXBvcnQgeyByZWQgfSBmcm9tIFwiLi4vZm10L2NvbG9ycy50c1wiO1xuaW1wb3J0IHsgY29tcGFyZUV0YWcsIGNyZWF0ZUNvbW1vblJlc3BvbnNlIH0gZnJvbSBcIi4vdXRpbC50c1wiO1xuaW1wb3J0IHsgRGlnZXN0QWxnb3JpdGhtIH0gZnJvbSBcIi4uL2NyeXB0by9jcnlwdG8udHNcIjtcbmltcG9ydCB7IHRvSGFzaFN0cmluZyB9IGZyb20gXCIuLi9jcnlwdG8vdG9faGFzaF9zdHJpbmcudHNcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiLi4vY3J5cHRvL191dGlsLnRzXCI7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSBcIi4uL3ZlcnNpb24udHNcIjtcbmludGVyZmFjZSBFbnRyeUluZm8ge1xuICBtb2RlOiBzdHJpbmc7XG4gIHNpemU6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG4vLyBhdm9pZCB0b3AtbGVidmVsLWF3YWl0XG5jb25zdCBlbnZQZXJtaXNzaW9uU3RhdHVzID1cbiAgRGVuby5wZXJtaXNzaW9ucy5xdWVyeVN5bmM/Lih7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFTk9fREVQTE9ZTUVOVF9JRFwiIH0pXG4gICAgLnN0YXRlID8/IFwiZ3JhbnRlZFwiOyAvLyBmb3IgZGVubyBkZXBsb3lcbmNvbnN0IERFTk9fREVQTE9ZTUVOVF9JRCA9IGVudlBlcm1pc3Npb25TdGF0dXMgPT09IFwiZ3JhbnRlZFwiXG4gID8gRGVuby5lbnYuZ2V0KFwiREVOT19ERVBMT1lNRU5UX0lEXCIpXG4gIDogdW5kZWZpbmVkO1xuY29uc3QgaGFzaGVkRGVub0RlcGxveW1lbnRJZCA9IERFTk9fREVQTE9ZTUVOVF9JRFxuICA/IGNyZWF0ZUhhc2goXCJGTlYzMkFcIiwgREVOT19ERVBMT1lNRU5UX0lEKS50aGVuKChoYXNoKSA9PiB0b0hhc2hTdHJpbmcoaGFzaCkpXG4gIDogdW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBtb2RlVG9TdHJpbmcoaXNEaXI6IGJvb2xlYW4sIG1heWJlTW9kZTogbnVtYmVyIHwgbnVsbCk6IHN0cmluZyB7XG4gIGNvbnN0IG1vZGVNYXAgPSBbXCItLS1cIiwgXCItLXhcIiwgXCItdy1cIiwgXCItd3hcIiwgXCJyLS1cIiwgXCJyLXhcIiwgXCJydy1cIiwgXCJyd3hcIl07XG5cbiAgaWYgKG1heWJlTW9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBcIih1bmtub3duIG1vZGUpXCI7XG4gIH1cbiAgY29uc3QgbW9kZSA9IG1heWJlTW9kZS50b1N0cmluZyg4KTtcbiAgaWYgKG1vZGUubGVuZ3RoIDwgMykge1xuICAgIHJldHVybiBcIih1bmtub3duIG1vZGUpXCI7XG4gIH1cbiAgbGV0IG91dHB1dCA9IFwiXCI7XG4gIG1vZGVcbiAgICAuc3BsaXQoXCJcIilcbiAgICAucmV2ZXJzZSgpXG4gICAgLnNsaWNlKDAsIDMpXG4gICAgLmZvckVhY2goKHYpID0+IHtcbiAgICAgIG91dHB1dCA9IGAke21vZGVNYXBbK3ZdfSAke291dHB1dH1gO1xuICAgIH0pO1xuICBvdXRwdXQgPSBgJHtpc0RpciA/IFwiZFwiIDogXCItXCJ9ICR7b3V0cHV0fWA7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbmZ1bmN0aW9uIGZpbGVMZW5Ub1N0cmluZyhsZW46IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IG11bHRpcGxpZXIgPSAxMDI0O1xuICBsZXQgYmFzZSA9IDE7XG4gIGNvbnN0IHN1ZmZpeCA9IFtcIkJcIiwgXCJLXCIsIFwiTVwiLCBcIkdcIiwgXCJUXCJdO1xuICBsZXQgc3VmZml4SW5kZXggPSAwO1xuXG4gIHdoaWxlIChiYXNlICogbXVsdGlwbGllciA8IGxlbikge1xuICAgIGlmIChzdWZmaXhJbmRleCA+PSBzdWZmaXgubGVuZ3RoIC0gMSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGJhc2UgKj0gbXVsdGlwbGllcjtcbiAgICBzdWZmaXhJbmRleCsrO1xuICB9XG5cbiAgcmV0dXJuIGAkeyhsZW4gLyBiYXNlKS50b0ZpeGVkKDIpfSR7c3VmZml4W3N1ZmZpeEluZGV4XX1gO1xufVxuXG4vKiogSW50ZXJmYWNlIGZvciBzZXJ2ZUZpbGUgb3B0aW9ucy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVGaWxlT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWxnb3JpdGhtIHRvIHVzZSBmb3IgZ2VuZXJhdGluZyB0aGUgRVRhZy5cbiAgICpcbiAgICogQGRlZmF1bHQge1wiZm52MWFcIn1cbiAgICovXG4gIGV0YWdBbGdvcml0aG0/OiBEaWdlc3RBbGdvcml0aG07XG4gIC8qKiBBbiBvcHRpb25hbCBGaWxlSW5mbyBvYmplY3QgcmV0dXJuZWQgYnkgRGVuby5zdGF0LiBJdCBpcyB1c2VkIGZvciBvcHRpbWl6YXRpb24gcHVycG9zZXMuICovXG4gIGZpbGVJbmZvPzogRGVuby5GaWxlSW5mbztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEhUVFAgUmVzcG9uc2Ugd2l0aCB0aGUgcmVxdWVzdGVkIGZpbGUgYXMgdGhlIGJvZHkuXG4gKiBAcGFyYW0gcmVxIFRoZSBzZXJ2ZXIgcmVxdWVzdCBjb250ZXh0IHVzZWQgdG8gY2xlYW51cCB0aGUgZmlsZSBoYW5kbGUuXG4gKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiB0aGUgZmlsZSB0byBzZXJ2ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcnZlRmlsZShcbiAgcmVxOiBSZXF1ZXN0LFxuICBmaWxlUGF0aDogc3RyaW5nLFxuICB7IGV0YWdBbGdvcml0aG0sIGZpbGVJbmZvIH06IFNlcnZlRmlsZU9wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgdHJ5IHtcbiAgICBmaWxlSW5mbyA/Pz0gYXdhaXQgRGVuby5zdGF0KGZpbGVQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgYXdhaXQgcmVxLmJvZHk/LmNhbmNlbCgpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUNvbW1vblJlc3BvbnNlKFN0YXR1cy5Ob3RGb3VuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmaWxlSW5mby5pc0RpcmVjdG9yeSkge1xuICAgIGF3YWl0IHJlcS5ib2R5Py5jYW5jZWwoKTtcbiAgICByZXR1cm4gY3JlYXRlQ29tbW9uUmVzcG9uc2UoU3RhdHVzLk5vdEZvdW5kKTtcbiAgfVxuXG4gIGNvbnN0IGZpbGUgPSBhd2FpdCBEZW5vLm9wZW4oZmlsZVBhdGgpO1xuXG4gIGNvbnN0IGhlYWRlcnMgPSBzZXRCYXNlSGVhZGVycygpO1xuXG4gIC8vIFNldCBtaW1lLXR5cGUgdXNpbmcgdGhlIGZpbGUgZXh0ZW5zaW9uIGluIGZpbGVQYXRoXG4gIGNvbnN0IGNvbnRlbnRUeXBlVmFsdWUgPSBjb250ZW50VHlwZShleHRuYW1lKGZpbGVQYXRoKSk7XG4gIGlmIChjb250ZW50VHlwZVZhbHVlKSB7XG4gICAgaGVhZGVycy5zZXQoXCJjb250ZW50LXR5cGVcIiwgY29udGVudFR5cGVWYWx1ZSk7XG4gIH1cblxuICAvLyBTZXQgZGF0ZSBoZWFkZXIgaWYgYWNjZXNzIHRpbWVzdGFtcCBpcyBhdmFpbGFibGVcbiAgaWYgKGZpbGVJbmZvLmF0aW1lIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShmaWxlSW5mby5hdGltZSk7XG4gICAgaGVhZGVycy5zZXQoXCJkYXRlXCIsIGRhdGUudG9VVENTdHJpbmcoKSk7XG4gIH1cblxuICAvLyBDcmVhdGUgYSBzaW1wbGUgZXRhZyB0aGF0IGlzIGFuIG1kNSBvZiB0aGUgbGFzdCBtb2RpZmllZCBkYXRlIGFuZCBmaWxlc2l6ZSBjb25jYXRlbmF0ZWRcbiAgY29uc3QgZXRhZyA9IGZpbGVJbmZvLm10aW1lXG4gICAgPyB0b0hhc2hTdHJpbmcoXG4gICAgICBhd2FpdCBjcmVhdGVIYXNoKFxuICAgICAgICBldGFnQWxnb3JpdGhtID8/IFwiRk5WMzJBXCIsXG4gICAgICAgIGAke2ZpbGVJbmZvLm10aW1lLnRvSlNPTigpfSR7ZmlsZUluZm8uc2l6ZX1gLFxuICAgICAgKSxcbiAgICApXG4gICAgOiBhd2FpdCBoYXNoZWREZW5vRGVwbG95bWVudElkO1xuXG4gIC8vIFNldCBsYXN0IG1vZGlmaWVkIGhlYWRlciBpZiBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lc3RhbXAgaXMgYXZhaWxhYmxlXG4gIGlmIChmaWxlSW5mby5tdGltZSkge1xuICAgIGhlYWRlcnMuc2V0KFwibGFzdC1tb2RpZmllZFwiLCBmaWxlSW5mby5tdGltZS50b1VUQ1N0cmluZygpKTtcbiAgfVxuICBpZiAoZXRhZykge1xuICAgIGhlYWRlcnMuc2V0KFwiZXRhZ1wiLCBldGFnKTtcbiAgfVxuXG4gIGlmIChldGFnIHx8IGZpbGVJbmZvLm10aW1lKSB7XG4gICAgLy8gSWYgYSBgaWYtbm9uZS1tYXRjaGAgaGVhZGVyIGlzIHByZXNlbnQgYW5kIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSB0YWcgb3JcbiAgICAvLyBpZiBhIGBpZi1tb2RpZmllZC1zaW5jZWAgaGVhZGVyIGlzIHByZXNlbnQgYW5kIHRoZSB2YWx1ZSBpcyBiaWdnZXIgdGhhblxuICAgIC8vIHRoZSBhY2Nlc3MgdGltZXN0YW1wIHZhbHVlLCB0aGVuIHJldHVybiAzMDRcbiAgICBjb25zdCBpZk5vbmVNYXRjaCA9IHJlcS5oZWFkZXJzLmdldChcImlmLW5vbmUtbWF0Y2hcIik7XG4gICAgY29uc3QgaWZNb2RpZmllZFNpbmNlID0gcmVxLmhlYWRlcnMuZ2V0KFwiaWYtbW9kaWZpZWQtc2luY2VcIik7XG4gICAgaWYgKFxuICAgICAgKGV0YWcgJiYgaWZOb25lTWF0Y2ggJiYgY29tcGFyZUV0YWcoaWZOb25lTWF0Y2gsIGV0YWcpKSB8fFxuICAgICAgKGlmTm9uZU1hdGNoID09PSBudWxsICYmXG4gICAgICAgIGZpbGVJbmZvLm10aW1lICYmXG4gICAgICAgIGlmTW9kaWZpZWRTaW5jZSAmJlxuICAgICAgICBmaWxlSW5mby5tdGltZS5nZXRUaW1lKCkgPCBuZXcgRGF0ZShpZk1vZGlmaWVkU2luY2UpLmdldFRpbWUoKSArIDEwMDApXG4gICAgKSB7XG4gICAgICBmaWxlLmNsb3NlKCk7XG5cbiAgICAgIHJldHVybiBjcmVhdGVDb21tb25SZXNwb25zZShTdGF0dXMuTm90TW9kaWZpZWQsIG51bGwsIHsgaGVhZGVycyB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBHZXQgYW5kIHBhcnNlIHRoZSBcInJhbmdlXCIgaGVhZGVyXG4gIGNvbnN0IHJhbmdlID0gcmVxLmhlYWRlcnMuZ2V0KFwicmFuZ2VcIikgYXMgc3RyaW5nO1xuICBjb25zdCByYW5nZVJlID0gL2J5dGVzPShcXGQrKS0oXFxkKyk/LztcbiAgY29uc3QgcGFyc2VkID0gcmFuZ2VSZS5leGVjKHJhbmdlKTtcblxuICAvLyBVc2UgdGhlIHBhcnNlZCB2YWx1ZSBpZiBhdmFpbGFibGUsIGZhbGxiYWNrIHRvIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBlbnRpcmUgZmlsZVxuICBjb25zdCBzdGFydCA9IHBhcnNlZCAmJiBwYXJzZWRbMV0gPyArcGFyc2VkWzFdIDogMDtcbiAgY29uc3QgZW5kID0gcGFyc2VkICYmIHBhcnNlZFsyXSA/ICtwYXJzZWRbMl0gOiBmaWxlSW5mby5zaXplIC0gMTtcblxuICAvLyBJZiB0aGVyZSBpcyBhIHJhbmdlLCBzZXQgdGhlIHN0YXR1cyB0byAyMDYsIGFuZCBzZXQgdGhlIFwiQ29udGVudC1yYW5nZVwiIGhlYWRlci5cbiAgaWYgKHJhbmdlICYmIHBhcnNlZCkge1xuICAgIGhlYWRlcnMuc2V0KFwiY29udGVudC1yYW5nZVwiLCBgYnl0ZXMgJHtzdGFydH0tJHtlbmR9LyR7ZmlsZUluZm8uc2l6ZX1gKTtcbiAgfVxuXG4gIC8vIFJldHVybiA0MTYgaWYgYHN0YXJ0YCBpc24ndCBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gYGVuZGAsIG9yIGBzdGFydGAgb3IgYGVuZGAgYXJlIGdyZWF0ZXIgdGhhbiB0aGUgZmlsZSdzIHNpemVcbiAgY29uc3QgbWF4UmFuZ2UgPSBmaWxlSW5mby5zaXplIC0gMTtcblxuICBpZiAoXG4gICAgcmFuZ2UgJiZcbiAgICAoIXBhcnNlZCB8fFxuICAgICAgdHlwZW9mIHN0YXJ0ICE9PSBcIm51bWJlclwiIHx8XG4gICAgICBzdGFydCA+IGVuZCB8fFxuICAgICAgc3RhcnQgPiBtYXhSYW5nZSB8fFxuICAgICAgZW5kID4gbWF4UmFuZ2UpXG4gICkge1xuICAgIGZpbGUuY2xvc2UoKTtcblxuICAgIHJldHVybiBjcmVhdGVDb21tb25SZXNwb25zZShcbiAgICAgIFN0YXR1cy5SZXF1ZXN0ZWRSYW5nZU5vdFNhdGlzZmlhYmxlLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAge1xuICAgICAgICBoZWFkZXJzLFxuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgLy8gU2V0IGNvbnRlbnQgbGVuZ3RoXG4gIGNvbnN0IGNvbnRlbnRMZW5ndGggPSBlbmQgLSBzdGFydCArIDE7XG4gIGhlYWRlcnMuc2V0KFwiY29udGVudC1sZW5ndGhcIiwgYCR7Y29udGVudExlbmd0aH1gKTtcbiAgaWYgKHJhbmdlICYmIHBhcnNlZCkge1xuICAgIGF3YWl0IGZpbGUuc2VlayhzdGFydCwgRGVuby5TZWVrTW9kZS5TdGFydCk7XG4gICAgcmV0dXJuIGNyZWF0ZUNvbW1vblJlc3BvbnNlKFN0YXR1cy5QYXJ0aWFsQ29udGVudCwgZmlsZS5yZWFkYWJsZSwge1xuICAgICAgaGVhZGVycyxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDb21tb25SZXNwb25zZShTdGF0dXMuT0ssIGZpbGUucmVhZGFibGUsIHsgaGVhZGVycyB9KTtcbn1cblxuLy8gVE9ETyhiYXJ0bG9taWVqdSk6IHNpbXBsaWZ5IHRoaXMgYWZ0ZXIgZGVuby5zdGF0IGFuZCBkZW5vLnJlYWREaXIgYXJlIGZpeGVkXG5hc3luYyBmdW5jdGlvbiBzZXJ2ZURpckluZGV4KFxuICBkaXJQYXRoOiBzdHJpbmcsXG4gIG9wdGlvbnM6IHtcbiAgICBkb3RmaWxlczogYm9vbGVhbjtcbiAgICB0YXJnZXQ6IHN0cmluZztcbiAgfSxcbik6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgY29uc3Qgc2hvd0RvdGZpbGVzID0gb3B0aW9ucy5kb3RmaWxlcztcbiAgY29uc3QgZGlyVXJsID0gYC8ke3Bvc2l4LnJlbGF0aXZlKG9wdGlvbnMudGFyZ2V0LCBkaXJQYXRoKX1gO1xuICBjb25zdCBsaXN0RW50cnk6IEVudHJ5SW5mb1tdID0gW107XG5cbiAgLy8gaWYgXCIuLlwiIG1ha2VzIHNlbnNlXG4gIGlmIChkaXJVcmwgIT09IFwiL1wiKSB7XG4gICAgY29uc3QgcHJldlBhdGggPSBwb3NpeC5qb2luKGRpclBhdGgsIFwiLi5cIik7XG4gICAgY29uc3QgZmlsZUluZm8gPSBhd2FpdCBEZW5vLnN0YXQocHJldlBhdGgpO1xuICAgIGxpc3RFbnRyeS5wdXNoKHtcbiAgICAgIG1vZGU6IG1vZGVUb1N0cmluZyh0cnVlLCBmaWxlSW5mby5tb2RlKSxcbiAgICAgIHNpemU6IFwiXCIsXG4gICAgICBuYW1lOiBcIi4uL1wiLFxuICAgICAgdXJsOiBwb3NpeC5qb2luKGRpclVybCwgXCIuLlwiKSxcbiAgICB9KTtcbiAgfVxuXG4gIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgRGVuby5yZWFkRGlyKGRpclBhdGgpKSB7XG4gICAgaWYgKCFzaG93RG90ZmlsZXMgJiYgZW50cnkubmFtZVswXSA9PT0gXCIuXCIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBmaWxlUGF0aCA9IHBvc2l4LmpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSk7XG4gICAgY29uc3QgZmlsZVVybCA9IGVuY29kZVVSSUNvbXBvbmVudChwb3NpeC5qb2luKGRpclVybCwgZW50cnkubmFtZSkpXG4gICAgICAucmVwbGFjZUFsbChcIiUyRlwiLCBcIi9cIik7XG4gICAgY29uc3QgZmlsZUluZm8gPSBhd2FpdCBEZW5vLnN0YXQoZmlsZVBhdGgpO1xuICAgIGxpc3RFbnRyeS5wdXNoKHtcbiAgICAgIG1vZGU6IG1vZGVUb1N0cmluZyhlbnRyeS5pc0RpcmVjdG9yeSwgZmlsZUluZm8ubW9kZSksXG4gICAgICBzaXplOiBlbnRyeS5pc0ZpbGUgPyBmaWxlTGVuVG9TdHJpbmcoZmlsZUluZm8uc2l6ZSA/PyAwKSA6IFwiXCIsXG4gICAgICBuYW1lOiBgJHtlbnRyeS5uYW1lfSR7ZW50cnkuaXNEaXJlY3RvcnkgPyBcIi9cIiA6IFwiXCJ9YCxcbiAgICAgIHVybDogYCR7ZmlsZVVybH0ke2VudHJ5LmlzRGlyZWN0b3J5ID8gXCIvXCIgOiBcIlwifWAsXG4gICAgfSk7XG4gIH1cbiAgbGlzdEVudHJ5LnNvcnQoKGEsIGIpID0+XG4gICAgYS5uYW1lLnRvTG93ZXJDYXNlKCkgPiBiLm5hbWUudG9Mb3dlckNhc2UoKSA/IDEgOiAtMVxuICApO1xuICBjb25zdCBmb3JtYXR0ZWREaXJVcmwgPSBgJHtkaXJVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9gO1xuICBjb25zdCBwYWdlID0gZW5jb2Rlci5lbmNvZGUoZGlyVmlld2VyVGVtcGxhdGUoZm9ybWF0dGVkRGlyVXJsLCBsaXN0RW50cnkpKTtcblxuICBjb25zdCBoZWFkZXJzID0gc2V0QmFzZUhlYWRlcnMoKTtcbiAgaGVhZGVycy5zZXQoXCJjb250ZW50LXR5cGVcIiwgXCJ0ZXh0L2h0bWxcIik7XG5cbiAgcmV0dXJuIGNyZWF0ZUNvbW1vblJlc3BvbnNlKFN0YXR1cy5PSywgcGFnZSwgeyBoZWFkZXJzIH0pO1xufVxuXG5mdW5jdGlvbiBzZXJ2ZUZhbGxiYWNrKF9yZXE6IFJlcXVlc3QsIGU6IEVycm9yKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICBpZiAoZSBpbnN0YW5jZW9mIFVSSUVycm9yKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjcmVhdGVDb21tb25SZXNwb25zZShTdGF0dXMuQmFkUmVxdWVzdCkpO1xuICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoY3JlYXRlQ29tbW9uUmVzcG9uc2UoU3RhdHVzLk5vdEZvdW5kKSk7XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNyZWF0ZUNvbW1vblJlc3BvbnNlKFN0YXR1cy5JbnRlcm5hbFNlcnZlckVycm9yKSk7XG59XG5cbmZ1bmN0aW9uIHNlcnZlckxvZyhyZXE6IFJlcXVlc3QsIHN0YXR1czogbnVtYmVyKSB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGNvbnN0IGRhdGVGbXQgPSBgWyR7ZC5zbGljZSgwLCAxMCl9ICR7ZC5zbGljZSgxMSwgMTkpfV1gO1xuICBjb25zdCBub3JtYWxpemVkVXJsID0gbm9ybWFsaXplVVJMKHJlcS51cmwpO1xuICBjb25zdCBzID0gYCR7ZGF0ZUZtdH0gWyR7cmVxLm1ldGhvZH1dICR7bm9ybWFsaXplZFVybH0gJHtzdGF0dXN9YDtcbiAgLy8gdXNpbmcgY29uc29sZS5kZWJ1ZyBpbnN0ZWFkIG9mIGNvbnNvbGUubG9nIHNvIGNocm9tZSBpbnNwZWN0IHVzZXJzIGNhbiBoaWRlIHJlcXVlc3QgbG9nc1xuICBjb25zb2xlLmRlYnVnKHMpO1xufVxuXG5mdW5jdGlvbiBzZXRCYXNlSGVhZGVycygpOiBIZWFkZXJzIHtcbiAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XG4gIGhlYWRlcnMuc2V0KFwic2VydmVyXCIsIFwiZGVub1wiKTtcblxuICAvLyBTZXQgXCJhY2NlcHQtcmFuZ2VzXCIgc28gdGhhdCB0aGUgY2xpZW50IGtub3dzIGl0IGNhbiBtYWtlIHJhbmdlIHJlcXVlc3RzIG9uIGZ1dHVyZSByZXF1ZXN0c1xuICBoZWFkZXJzLnNldChcImFjY2VwdC1yYW5nZXNcIiwgXCJieXRlc1wiKTtcbiAgaGVhZGVycy5zZXQoXCJkYXRlXCIsIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKSk7XG5cbiAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbmZ1bmN0aW9uIGRpclZpZXdlclRlbXBsYXRlKGRpcm5hbWU6IHN0cmluZywgZW50cmllczogRW50cnlJbmZvW10pOiBzdHJpbmcge1xuICBjb25zdCBwYXRocyA9IGRpcm5hbWUuc3BsaXQoXCIvXCIpO1xuXG4gIHJldHVybiBgXG4gICAgPCFET0NUWVBFIGh0bWw+XG4gICAgPGh0bWwgbGFuZz1cImVuXCI+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPG1ldGEgY2hhcnNldD1cIlVURi04XCIgLz5cbiAgICAgICAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIiAvPlxuICAgICAgICA8bWV0YSBodHRwLWVxdWl2PVwiWC1VQS1Db21wYXRpYmxlXCIgY29udGVudD1cImllPWVkZ2VcIiAvPlxuICAgICAgICA8dGl0bGU+RGVubyBGaWxlIFNlcnZlcjwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICA6cm9vdCB7XG4gICAgICAgICAgICAtLWJhY2tncm91bmQtY29sb3I6ICNmYWZhZmE7XG4gICAgICAgICAgICAtLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuODcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBAbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG4gICAgICAgICAgICA6cm9vdCB7XG4gICAgICAgICAgICAgIC0tYmFja2dyb3VuZC1jb2xvcjogIzI5MjkyOTtcbiAgICAgICAgICAgICAgLS1jb2xvcjogI2ZmZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoZWFkIHtcbiAgICAgICAgICAgICAgY29sb3I6ICM3ZjdmN2Y7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIEBtZWRpYSAobWluLXdpZHRoOiA5NjBweCkge1xuICAgICAgICAgICAgbWFpbiB7XG4gICAgICAgICAgICAgIG1heC13aWR0aDogOTYwcHg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgICAgcGFkZGluZy1sZWZ0OiAzMnB4O1xuICAgICAgICAgICAgICBwYWRkaW5nLXJpZ2h0OiAzMnB4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBAbWVkaWEgKG1pbi13aWR0aDogNjAwcHgpIHtcbiAgICAgICAgICAgIG1haW4ge1xuICAgICAgICAgICAgICBwYWRkaW5nLWxlZnQ6IDI0cHg7XG4gICAgICAgICAgICAgIHBhZGRpbmctcmlnaHQ6IDI0cHg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJvZHkge1xuICAgICAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1jb2xvcik7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tY29sb3IpO1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6IFwiUm9ib3RvXCIsIFwiSGVsdmV0aWNhXCIsIFwiQXJpYWxcIiwgc2Fucy1zZXJpZjtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA0MDA7XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogMS40MztcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMC44NzVyZW07XG4gICAgICAgICAgfVxuICAgICAgICAgIGEge1xuICAgICAgICAgICAgY29sb3I6ICMyMTk2ZjM7XG4gICAgICAgICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGE6aG92ZXIge1xuICAgICAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoZWFkIHtcbiAgICAgICAgICAgIHRleHQtYWxpZ246IGxlZnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoZWFkIHRoIHtcbiAgICAgICAgICAgIHBhZGRpbmctYm90dG9tOiAxMnB4O1xuICAgICAgICAgIH1cbiAgICAgICAgICB0YWJsZSB0ZCB7XG4gICAgICAgICAgICBwYWRkaW5nOiA2cHggMzZweCA2cHggMHB4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAuc2l6ZSB7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiByaWdodDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDZweCAxMnB4IDZweCAyNHB4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAubW9kZSB7XG4gICAgICAgICAgICBmb250LWZhbWlseTogbW9ub3NwYWNlLCBtb25vc3BhY2U7XG4gICAgICAgICAgfVxuICAgICAgICA8L3N0eWxlPlxuICAgICAgPC9oZWFkPlxuICAgICAgPGJvZHk+XG4gICAgICAgIDxtYWluPlxuICAgICAgICAgIDxoMT5JbmRleCBvZlxuICAgICAgICAgIDxhIGhyZWY9XCIvXCI+aG9tZTwvYT4ke1xuICAgIHBhdGhzXG4gICAgICAubWFwKChwYXRoLCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgICAgaWYgKHBhdGggPT09IFwiXCIpIHJldHVybiBcIlwiO1xuICAgICAgICBjb25zdCBsaW5rID0gYXJyYXkuc2xpY2UoMCwgaW5kZXggKyAxKS5qb2luKFwiL1wiKTtcbiAgICAgICAgcmV0dXJuIGA8YSBocmVmPVwiJHtsaW5rfVwiPiR7cGF0aH08L2E+YDtcbiAgICAgIH0pXG4gICAgICAuam9pbihcIi9cIilcbiAgfVxuICAgICAgICAgIDwvaDE+XG4gICAgICAgICAgPHRhYmxlPlxuICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgPHRoPk1vZGU8L3RoPlxuICAgICAgICAgICAgICAgIDx0aD5TaXplPC90aD5cbiAgICAgICAgICAgICAgICA8dGg+TmFtZTwvdGg+XG4gICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgJHtcbiAgICBlbnRyaWVzXG4gICAgICAubWFwKFxuICAgICAgICAoZW50cnkpID0+IGBcbiAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwibW9kZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICR7ZW50cnkubW9kZX1cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwic2l6ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICR7ZW50cnkuc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2VudHJ5LnVybH1cIj4ke2VudHJ5Lm5hbWV9PC9hPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICBgLFxuICAgICAgKVxuICAgICAgLmpvaW4oXCJcIilcbiAgfVxuICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIDwvbWFpbj5cbiAgICAgIDwvYm9keT5cbiAgICA8L2h0bWw+XG4gIGA7XG59XG5cbi8qKiBJbnRlcmZhY2UgZm9yIHNlcnZlRGlyIG9wdGlvbnMuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlRGlyT3B0aW9ucyB7XG4gIC8qKiBTZXJ2ZXMgdGhlIGZpbGVzIHVuZGVyIHRoZSBnaXZlbiBkaXJlY3Rvcnkgcm9vdC4gRGVmYXVsdHMgdG8geW91ciBjdXJyZW50IGRpcmVjdG9yeS4gKi9cbiAgZnNSb290Pzogc3RyaW5nO1xuICAvKiogU3BlY2lmaWVkIHRoYXQgcGFydCBpcyBzdHJpcHBlZCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHJlcXVlc3RlZCBwYXRobmFtZS4gKi9cbiAgdXJsUm9vdD86IHN0cmluZztcbiAgLyoqIEVuYWJsZSBkaXJlY3RvcnkgbGlzdGluZy5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAgc2hvd0Rpckxpc3Rpbmc/OiBib29sZWFuO1xuICAvKiogU2VydmVzIGRvdGZpbGVzLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBzaG93RG90ZmlsZXM/OiBib29sZWFuO1xuICAvKiogU2VydmVzIGluZGV4Lmh0bWwgYXMgdGhlIGluZGV4IGZpbGUgb2YgdGhlIGRpcmVjdG9yeS4gKi9cbiAgc2hvd0luZGV4PzogYm9vbGVhbjtcbiAgLyoqIEVuYWJsZSBDT1JTIHZpYSB0aGUgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIiBoZWFkZXIuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICovXG4gIGVuYWJsZUNvcnM/OiBib29sZWFuO1xuICAvKiogRG8gbm90IHByaW50IHJlcXVlc3QgbGV2ZWwgbG9ncy4gRGVmYXVsdHMgdG8gZmFsc2UuXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICovXG4gIHF1aWV0PzogYm9vbGVhbjtcbiAgLyoqIFRoZSBhbGdvcml0aG0gdG8gdXNlIGZvciBnZW5lcmF0aW5nIHRoZSBFVGFnLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7XCJmbnYxYVwifVxuICAgKi9cbiAgZXRhZ0FsZ29yaXRobT86IERpZ2VzdEFsZ29yaXRobTtcbiAgLyoqIEhlYWRlcnMgdG8gYWRkIHRvIGVhY2ggcmVzcG9uc2VcbiAgICpcbiAgICogQGRlZmF1bHQge1tdfVxuICAgKi9cbiAgaGVhZGVycz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFNlcnZlcyB0aGUgZmlsZXMgdW5kZXIgdGhlIGdpdmVuIGRpcmVjdG9yeSByb290IChvcHRzLmZzUm9vdCkuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9zZXJ2ZXIudHNcIjtcbiAqIGltcG9ydCB7IHNlcnZlRGlyIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9maWxlX3NlcnZlci50c1wiO1xuICpcbiAqIHNlcnZlKChyZXEpID0+IHtcbiAqICAgY29uc3QgcGF0aG5hbWUgPSBuZXcgVVJMKHJlcS51cmwpLnBhdGhuYW1lO1xuICogICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi9zdGF0aWNcIikpIHtcbiAqICAgICByZXR1cm4gc2VydmVEaXIocmVxLCB7XG4gKiAgICAgICBmc1Jvb3Q6IFwicGF0aC90by9zdGF0aWMvZmlsZXMvZGlyXCIsXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqICAgLy8gRG8gZHluYW1pYyByZXNwb25zZXNcbiAqICAgcmV0dXJuIG5ldyBSZXNwb25zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBPcHRpb25hbGx5IHlvdSBjYW4gcGFzcyBgdXJsUm9vdGAgb3B0aW9uLiBJZiBpdCdzIHNwZWNpZmllZCB0aGF0IHBhcnQgaXMgc3RyaXBwZWQgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSByZXF1ZXN0ZWQgcGF0aG5hbWUuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHNlcnZlRGlyIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vaHR0cC9maWxlX3NlcnZlci50c1wiO1xuICpcbiAqIC8vIC4uLlxuICogc2VydmVEaXIobmV3IFJlcXVlc3QoXCJodHRwOi8vbG9jYWxob3N0L3N0YXRpYy9wYXRoL3RvL2ZpbGVcIiksIHtcbiAqICAgZnNSb290OiBcInB1YmxpY1wiLFxuICogICB1cmxSb290OiBcInN0YXRpY1wiLFxuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYWJvdmUgZXhhbXBsZSBzZXJ2ZXMgYC4vcHVibGljL3BhdGgvdG8vZmlsZWAgZm9yIHRoZSByZXF1ZXN0IHRvIGAvc3RhdGljL3BhdGgvdG8vZmlsZWAuXG4gKlxuICogQHBhcmFtIHJlcSBUaGUgcmVxdWVzdCB0byBoYW5kbGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcnZlRGlyKHJlcTogUmVxdWVzdCwgb3B0czogU2VydmVEaXJPcHRpb25zID0ge30pIHtcbiAgbGV0IHJlc3BvbnNlOiBSZXNwb25zZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgY29uc3QgdGFyZ2V0ID0gb3B0cy5mc1Jvb3QgfHwgXCIuXCI7XG4gIGNvbnN0IHVybFJvb3QgPSBvcHRzLnVybFJvb3Q7XG4gIGNvbnN0IHNob3dJbmRleCA9IG9wdHMuc2hvd0luZGV4ID8/IHRydWU7XG5cbiAgdHJ5IHtcbiAgICBsZXQgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVVUkwocmVxLnVybCk7XG4gICAgaWYgKHVybFJvb3QpIHtcbiAgICAgIGlmIChub3JtYWxpemVkUGF0aC5zdGFydHNXaXRoKFwiL1wiICsgdXJsUm9vdCkpIHtcbiAgICAgICAgbm9ybWFsaXplZFBhdGggPSBub3JtYWxpemVkUGF0aC5yZXBsYWNlKHVybFJvb3QsIFwiXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IERlbm8uZXJyb3JzLk5vdEZvdW5kKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZnNQYXRoID0gcG9zaXguam9pbih0YXJnZXQsIG5vcm1hbGl6ZWRQYXRoKTtcbiAgICBjb25zdCBmaWxlSW5mbyA9IGF3YWl0IERlbm8uc3RhdChmc1BhdGgpO1xuXG4gICAgaWYgKGZpbGVJbmZvLmlzRGlyZWN0b3J5KSB7XG4gICAgICBpZiAoc2hvd0luZGV4KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGF0aCA9IHBvc2l4LmpvaW4oZnNQYXRoLCBcImluZGV4Lmh0bWxcIik7XG4gICAgICAgICAgY29uc3QgaW5kZXhGaWxlSW5mbyA9IGF3YWl0IERlbm8ubHN0YXQocGF0aCk7XG4gICAgICAgICAgaWYgKGluZGV4RmlsZUluZm8uaXNGaWxlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY3VycmVudCBVUkwncyBwYXRobmFtZSBkb2Vzbid0IGVuZCB3aXRoIGEgc2xhc2gsIGFueVxuICAgICAgICAgICAgLy8gcmVsYXRpdmUgVVJMcyBpbiB0aGUgaW5kZXggZmlsZSB3aWxsIHJlc29sdmUgYWdhaW5zdCB0aGUgcGFyZW50XG4gICAgICAgICAgICAvLyBkaXJlY3RvcnksIHJhdGhlciB0aGFuIHRoZSBjdXJyZW50IGRpcmVjdG9yeS4gVG8gcHJldmVudCB0aGF0LCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIGEgMzAxIHJlZGlyZWN0IHRvIHRoZSBVUkwgd2l0aCBhIHNsYXNoLlxuICAgICAgICAgICAgaWYgKCFmc1BhdGguZW5kc1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgICAgICAgICAgIHVybC5wYXRobmFtZSArPSBcIi9cIjtcbiAgICAgICAgICAgICAgcmV0dXJuIFJlc3BvbnNlLnJlZGlyZWN0KHVybCwgMzAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgc2VydmVGaWxlKHJlcSwgcGF0aCwge1xuICAgICAgICAgICAgICBldGFnQWxnb3JpdGhtOiBvcHRzLmV0YWdBbGdvcml0aG0sXG4gICAgICAgICAgICAgIGZpbGVJbmZvOiBpbmRleEZpbGVJbmZvLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcGFzc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlICYmIG9wdHMuc2hvd0Rpckxpc3RpbmcpIHtcbiAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCBzZXJ2ZURpckluZGV4KGZzUGF0aCwge1xuICAgICAgICAgIGRvdGZpbGVzOiBvcHRzLnNob3dEb3RmaWxlcyB8fCBmYWxzZSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKCFyZXNwb25zZSkge1xuICAgICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuTm90Rm91bmQoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzcG9uc2UgPSBhd2FpdCBzZXJ2ZUZpbGUocmVxLCBmc1BhdGgsIHtcbiAgICAgICAgZXRhZ0FsZ29yaXRobTogb3B0cy5ldGFnQWxnb3JpdGhtLFxuICAgICAgICBmaWxlSW5mbyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVyciA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUgOiBuZXcgRXJyb3IoXCJbbm9uLWVycm9yIHRocm93bl1cIik7XG4gICAgaWYgKCFvcHRzLnF1aWV0KSBjb25zb2xlLmVycm9yKHJlZChlcnIubWVzc2FnZSkpO1xuICAgIHJlc3BvbnNlID0gYXdhaXQgc2VydmVGYWxsYmFjayhyZXEsIGVycik7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVDb3JzKSB7XG4gICAgYXNzZXJ0KHJlc3BvbnNlKTtcbiAgICByZXNwb25zZS5oZWFkZXJzLmFwcGVuZChcImFjY2Vzcy1jb250cm9sLWFsbG93LW9yaWdpblwiLCBcIipcIik7XG4gICAgcmVzcG9uc2UuaGVhZGVycy5hcHBlbmQoXG4gICAgICBcImFjY2Vzcy1jb250cm9sLWFsbG93LWhlYWRlcnNcIixcbiAgICAgIFwiT3JpZ2luLCBYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEFjY2VwdCwgUmFuZ2VcIixcbiAgICApO1xuICB9XG5cbiAgaWYgKCFvcHRzLnF1aWV0KSBzZXJ2ZXJMb2cocmVxLCByZXNwb25zZSEuc3RhdHVzKTtcblxuICBpZiAob3B0cy5oZWFkZXJzKSB7XG4gICAgZm9yIChjb25zdCBoZWFkZXIgb2Ygb3B0cy5oZWFkZXJzKSB7XG4gICAgICBjb25zdCBoZWFkZXJTcGxpdCA9IGhlYWRlci5zcGxpdChcIjpcIik7XG4gICAgICBjb25zdCBuYW1lID0gaGVhZGVyU3BsaXRbMF07XG4gICAgICBjb25zdCB2YWx1ZSA9IGhlYWRlclNwbGl0LnNsaWNlKDEpLmpvaW4oXCI6XCIpO1xuICAgICAgcmVzcG9uc2UuaGVhZGVycy5hcHBlbmQobmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXNwb25zZSE7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVVSTCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwb3NpeC5ub3JtYWxpemUoZGVjb2RlVVJJQ29tcG9uZW50KG5ldyBVUkwodXJsKS5wYXRobmFtZSkpO1xufVxuXG5mdW5jdGlvbiBtYWluKCkge1xuICBjb25zdCBzZXJ2ZXJBcmdzID0gcGFyc2UoRGVuby5hcmdzLCB7XG4gICAgc3RyaW5nOiBbXCJwb3J0XCIsIFwiaG9zdFwiLCBcImNlcnRcIiwgXCJrZXlcIiwgXCJoZWFkZXJcIl0sXG4gICAgYm9vbGVhbjogW1wiaGVscFwiLCBcImRpci1saXN0aW5nXCIsIFwiZG90ZmlsZXNcIiwgXCJjb3JzXCIsIFwidmVyYm9zZVwiLCBcInZlcnNpb25cIl0sXG4gICAgbmVnYXRhYmxlOiBbXCJkaXItbGlzdGluZ1wiLCBcImRvdGZpbGVzXCIsIFwiY29yc1wiXSxcbiAgICBjb2xsZWN0OiBbXCJoZWFkZXJcIl0sXG4gICAgZGVmYXVsdDoge1xuICAgICAgXCJkaXItbGlzdGluZ1wiOiB0cnVlLFxuICAgICAgZG90ZmlsZXM6IHRydWUsXG4gICAgICBjb3JzOiB0cnVlLFxuICAgICAgdmVyYm9zZTogZmFsc2UsXG4gICAgICB2ZXJzaW9uOiBmYWxzZSxcbiAgICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxuICAgICAgcG9ydDogXCI0NTA3XCIsXG4gICAgICBjZXJ0OiBcIlwiLFxuICAgICAga2V5OiBcIlwiLFxuICAgIH0sXG4gICAgYWxpYXM6IHtcbiAgICAgIHA6IFwicG9ydFwiLFxuICAgICAgYzogXCJjZXJ0XCIsXG4gICAgICBrOiBcImtleVwiLFxuICAgICAgaDogXCJoZWxwXCIsXG4gICAgICB2OiBcInZlcmJvc2VcIixcbiAgICAgIFY6IFwidmVyc2lvblwiLFxuICAgICAgSDogXCJoZWFkZXJcIixcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgcG9ydCA9IE51bWJlcihzZXJ2ZXJBcmdzLnBvcnQpO1xuICBjb25zdCBoZWFkZXJzID0gc2VydmVyQXJncy5oZWFkZXIgfHwgW107XG4gIGNvbnN0IGhvc3QgPSBzZXJ2ZXJBcmdzLmhvc3Q7XG4gIGNvbnN0IGNlcnRGaWxlID0gc2VydmVyQXJncy5jZXJ0O1xuICBjb25zdCBrZXlGaWxlID0gc2VydmVyQXJncy5rZXk7XG5cbiAgaWYgKHNlcnZlckFyZ3MuaGVscCkge1xuICAgIHByaW50VXNhZ2UoKTtcbiAgICBEZW5vLmV4aXQoKTtcbiAgfVxuXG4gIGlmIChzZXJ2ZXJBcmdzLnZlcnNpb24pIHtcbiAgICBjb25zb2xlLmxvZyhgRGVubyBGaWxlIFNlcnZlciAke1ZFUlNJT059YCk7XG4gICAgRGVuby5leGl0KCk7XG4gIH1cblxuICBpZiAoa2V5RmlsZSB8fCBjZXJ0RmlsZSkge1xuICAgIGlmIChrZXlGaWxlID09PSBcIlwiIHx8IGNlcnRGaWxlID09PSBcIlwiKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIi0ta2V5IGFuZCAtLWNlcnQgYXJlIHJlcXVpcmVkIGZvciBUTFNcIik7XG4gICAgICBwcmludFVzYWdlKCk7XG4gICAgICBEZW5vLmV4aXQoMSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgd2lsZCA9IHNlcnZlckFyZ3MuXyBhcyBzdHJpbmdbXTtcbiAgY29uc3QgdGFyZ2V0ID0gcG9zaXgucmVzb2x2ZSh3aWxkWzBdID8/IFwiXCIpO1xuXG4gIGNvbnN0IGhhbmRsZXIgPSAocmVxOiBSZXF1ZXN0KTogUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuICAgIHJldHVybiBzZXJ2ZURpcihyZXEsIHtcbiAgICAgIGZzUm9vdDogdGFyZ2V0LFxuICAgICAgc2hvd0Rpckxpc3Rpbmc6IHNlcnZlckFyZ3NbXCJkaXItbGlzdGluZ1wiXSxcbiAgICAgIHNob3dEb3RmaWxlczogc2VydmVyQXJncy5kb3RmaWxlcyxcbiAgICAgIGVuYWJsZUNvcnM6IHNlcnZlckFyZ3MuY29ycyxcbiAgICAgIHF1aWV0OiAhc2VydmVyQXJncy52ZXJib3NlLFxuICAgICAgaGVhZGVycyxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCB1c2VUbHMgPSAhIShrZXlGaWxlICYmIGNlcnRGaWxlKTtcblxuICBpZiAodXNlVGxzKSB7XG4gICAgc2VydmVUbHMoaGFuZGxlciwge1xuICAgICAgcG9ydCxcbiAgICAgIGhvc3RuYW1lOiBob3N0LFxuICAgICAgY2VydEZpbGUsXG4gICAgICBrZXlGaWxlLFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHNlcnZlKGhhbmRsZXIsIHsgcG9ydCwgaG9zdG5hbWU6IGhvc3QgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRVc2FnZSgpIHtcbiAgY29uc29sZS5sb2coYERlbm8gRmlsZSBTZXJ2ZXIgJHtWRVJTSU9OfVxuICBTZXJ2ZXMgYSBsb2NhbCBkaXJlY3RvcnkgaW4gSFRUUC5cblxuSU5TVEFMTDpcbiAgZGVubyBpbnN0YWxsIC0tYWxsb3ctbmV0IC0tYWxsb3ctcmVhZCBodHRwczovL2Rlbm8ubGFuZC9zdGQvaHR0cC9maWxlX3NlcnZlci50c1xuXG5VU0FHRTpcbiAgZmlsZV9zZXJ2ZXIgW3BhdGhdIFtvcHRpb25zXVxuXG5PUFRJT05TOlxuICAtaCwgLS1oZWxwICAgICAgICAgICAgUHJpbnRzIGhlbHAgaW5mb3JtYXRpb25cbiAgLXAsIC0tcG9ydCA8UE9SVD4gICAgIFNldCBwb3J0XG4gIC0tY29ycyAgICAgICAgICAgICAgICBFbmFibGUgQ09SUyB2aWEgdGhlIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCIgaGVhZGVyXG4gIC0taG9zdCAgICAgPEhPU1Q+ICAgICBIb3N0bmFtZSAoZGVmYXVsdCBpcyAwLjAuMC4wKVxuICAtYywgLS1jZXJ0IDxGSUxFPiAgICAgVExTIGNlcnRpZmljYXRlIGZpbGUgKGVuYWJsZXMgVExTKVxuICAtaywgLS1rZXkgIDxGSUxFPiAgICAgVExTIGtleSBmaWxlIChlbmFibGVzIFRMUylcbiAgLUgsIC0taGVhZGVyIDxIRUFERVI+IFNldHMgYSBoZWFkZXIgb24gZXZlcnkgcmVxdWVzdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIChlLmcuIC0taGVhZGVyIFwiQ2FjaGUtQ29udHJvbDogbm8tY2FjaGVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIFRoaXMgb3B0aW9uIGNhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMuXG4gIC0tbm8tZGlyLWxpc3RpbmcgICAgICBEaXNhYmxlIGRpcmVjdG9yeSBsaXN0aW5nXG4gIC0tbm8tZG90ZmlsZXMgICAgICAgICBEbyBub3Qgc2hvdyBkb3RmaWxlc1xuICAtLW5vLWNvcnMgICAgICAgICAgICAgRGlzYWJsZSBjcm9zcy1vcmlnaW4gcmVzb3VyY2Ugc2hhcmluZ1xuICAtdiwgLS12ZXJib3NlICAgICAgICAgUHJpbnQgcmVxdWVzdCBsZXZlbCBsb2dzXG4gIC1WLCAtLXZlcnNpb24gICAgICAgICBQcmludCB2ZXJzaW9uIGluZm9ybWF0aW9uXG5cbiAgQWxsIFRMUyBvcHRpb25zIGFyZSByZXF1aXJlZCB3aGVuIG9uZSBpcyBwcm92aWRlZC5gKTtcbn1cblxuaWYgKGltcG9ydC5tZXRhLm1haW4pIHtcbiAgbWFpbigpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0EsMEVBQTBFO0FBRTFFLGdFQUFnRTtBQUNoRSwyQ0FBMkM7QUFDM0MsZ0ZBQWdGO0FBRWhGLFNBQVMsT0FBTyxFQUFFLEtBQUssUUFBUSxnQkFBZ0IsQ0FBQztBQUNoRCxTQUFTLFdBQVcsUUFBUSxnQ0FBZ0MsQ0FBQztBQUM3RCxTQUFTLEtBQUssRUFBRSxRQUFRLFFBQVEsYUFBYSxDQUFDO0FBQzlDLFNBQVMsTUFBTSxRQUFRLGtCQUFrQixDQUFDO0FBQzFDLFNBQVMsS0FBSyxRQUFRLGlCQUFpQixDQUFDO0FBQ3hDLFNBQVMsTUFBTSxRQUFRLHFCQUFxQixDQUFDO0FBQzdDLFNBQVMsR0FBRyxRQUFRLGtCQUFrQixDQUFDO0FBQ3ZDLFNBQVMsV0FBVyxFQUFFLG9CQUFvQixRQUFRLFdBQVcsQ0FBQztBQUU5RCxTQUFTLFlBQVksUUFBUSw2QkFBNkIsQ0FBQztBQUMzRCxTQUFTLFVBQVUsUUFBUSxvQkFBb0IsQ0FBQztBQUNoRCxTQUFTLE9BQU8sUUFBUSxlQUFlLENBQUM7QUFReEMs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