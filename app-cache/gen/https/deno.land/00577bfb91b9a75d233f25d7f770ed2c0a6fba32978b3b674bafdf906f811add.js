// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright the Browserify authors. MIT License.
// Ported mostly from https://github.com/browserify/path-browserify/
/**
 * Utilities for working with OS-specific file paths.
 *
 * This module is browser compatible.
 *
 * @module
 */ import { isWindows } from "../_util/os.ts";
import * as _win32 from "./win32.ts";
import * as _posix from "./posix.ts";
const path = isWindows ? _win32 : _posix;
export const win32 = _win32;
export const posix = _posix;
export const { basename , delimiter , dirname , extname , format , fromFileUrl , isAbsolute , join , normalize , parse , relative , resolve , sep , toFileUrl , toNamespacedPath ,  } = path;
export * from "./common.ts";
export { SEP, SEP_PATTERN } from "./separator.ts";
export * from "./_interface.ts";
export * from "./glob.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE2MC4wL3BhdGgvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgdGhlIEJyb3dzZXJpZnkgYXV0aG9ycy4gTUlUIExpY2Vuc2UuXG4vLyBQb3J0ZWQgbW9zdGx5IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvcGF0aC1icm93c2VyaWZ5L1xuXG4vKipcbiAqIFV0aWxpdGllcyBmb3Igd29ya2luZyB3aXRoIE9TLXNwZWNpZmljIGZpbGUgcGF0aHMuXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBpc1dpbmRvd3MgfSBmcm9tIFwiLi4vX3V0aWwvb3MudHNcIjtcbmltcG9ydCAqIGFzIF93aW4zMiBmcm9tIFwiLi93aW4zMi50c1wiO1xuaW1wb3J0ICogYXMgX3Bvc2l4IGZyb20gXCIuL3Bvc2l4LnRzXCI7XG5cbmNvbnN0IHBhdGggPSBpc1dpbmRvd3MgPyBfd2luMzIgOiBfcG9zaXg7XG5cbmV4cG9ydCBjb25zdCB3aW4zMiA9IF93aW4zMjtcbmV4cG9ydCBjb25zdCBwb3NpeCA9IF9wb3NpeDtcbmV4cG9ydCBjb25zdCB7XG4gIGJhc2VuYW1lLFxuICBkZWxpbWl0ZXIsXG4gIGRpcm5hbWUsXG4gIGV4dG5hbWUsXG4gIGZvcm1hdCxcbiAgZnJvbUZpbGVVcmwsXG4gIGlzQWJzb2x1dGUsXG4gIGpvaW4sXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2UsXG4gIHJlbGF0aXZlLFxuICByZXNvbHZlLFxuICBzZXAsXG4gIHRvRmlsZVVybCxcbiAgdG9OYW1lc3BhY2VkUGF0aCxcbn0gPSBwYXRoO1xuXG5leHBvcnQgKiBmcm9tIFwiLi9jb21tb24udHNcIjtcbmV4cG9ydCB7IFNFUCwgU0VQX1BBVFRFUk4gfSBmcm9tIFwiLi9zZXBhcmF0b3IudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL2dsb2IudHNcIjtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsaURBQWlEO0FBQ2pELG9FQUFvRTtBQUVwRTs7Ozs7O0NBTUMsR0FFRCxTQUFTLFNBQVMsUUFBUSxnQkFBZ0IsQ0FBQztBQUMzQyxZQUFZLE1BQU0sTUFBTSxZQUFZLENBQUM7QUFDckMsWUFBWSxNQUFNLE1BQU0sWUFBWSxDQUFDO0FBRXJDLE1BQU0sSUFBSSxHQUFHLFNBQVMsR0FBRyxNQUFNLEdBQUcsTUFBTSxBQUFDO0FBRXpDLE9BQU8sTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQzVCLE9BQU8sTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQzVCLE9BQU8sTUFBTSxFQUNYLFFBQVEsQ0FBQSxFQUNSLFNBQVMsQ0FBQSxFQUNULE9BQU8sQ0FBQSxFQUNQLE9BQU8sQ0FBQSxFQUNQLE1BQU0sQ0FBQSxFQUNOLFdBQVcsQ0FBQSxFQUNYLFVBQVUsQ0FBQSxFQUNWLElBQUksQ0FBQSxFQUNKLFNBQVMsQ0FBQSxFQUNULEtBQUssQ0FBQSxFQUNMLFFBQVEsQ0FBQSxFQUNSLE9BQU8sQ0FBQSxFQUNQLEdBQUcsQ0FBQSxFQUNILFNBQVMsQ0FBQSxFQUNULGdCQUFnQixDQUFBLElBQ2pCLEdBQUcsSUFBSSxDQUFDO0FBRVQsY0FBYyxhQUFhLENBQUM7QUFDNUIsU0FBUyxHQUFHLEVBQUUsV0FBVyxRQUFRLGdCQUFnQixDQUFDO0FBQ2xELGNBQWMsaUJBQWlCLENBQUM7QUFDaEMsY0FBYyxXQUFXLENBQUMifQ==