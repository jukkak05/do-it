/* Export file stuff */ import { includeFileHelper } from "./file-helpers.ts";
import { config } from "./config.ts";
config.includeFile = includeFileHelper;
config.filepathCache = {};
export { loadFile, renderFile, renderFile as __express, renderFileAsync } from "./file-handlers.ts";
/* End file stuff */ export { default as compileToString } from "./compile-string.ts";
export { default as compile } from "./compile.ts";
export { default as parse } from "./parse.ts";
export { default as render, renderAsync } from "./render.ts";
export { templates } from "./containers.ts";
export { config, config as defaultConfig, configure, getConfig } from "./config.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXRhQHYyLjAuMS9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogRXhwb3J0IGZpbGUgc3R1ZmYgKi9cbmltcG9ydCB7IGluY2x1ZGVGaWxlSGVscGVyIH0gZnJvbSBcIi4vZmlsZS1oZWxwZXJzLnRzXCI7XG5pbXBvcnQgeyBjb25maWcgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuY29uZmlnLmluY2x1ZGVGaWxlID0gaW5jbHVkZUZpbGVIZWxwZXI7XG5jb25maWcuZmlsZXBhdGhDYWNoZSA9IHt9O1xuXG5leHBvcnQge1xuICBsb2FkRmlsZSxcbiAgcmVuZGVyRmlsZSxcbiAgcmVuZGVyRmlsZSBhcyBfX2V4cHJlc3MsXG4gIHJlbmRlckZpbGVBc3luYyxcbn0gZnJvbSBcIi4vZmlsZS1oYW5kbGVycy50c1wiO1xuXG4vKiBFbmQgZmlsZSBzdHVmZiAqL1xuXG5leHBvcnQgeyBkZWZhdWx0IGFzIGNvbXBpbGVUb1N0cmluZyB9IGZyb20gXCIuL2NvbXBpbGUtc3RyaW5nLnRzXCI7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGNvbXBpbGUgfSBmcm9tIFwiLi9jb21waWxlLnRzXCI7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHBhcnNlIH0gZnJvbSBcIi4vcGFyc2UudHNcIjtcbmV4cG9ydCB7IGRlZmF1bHQgYXMgcmVuZGVyLCByZW5kZXJBc3luYyB9IGZyb20gXCIuL3JlbmRlci50c1wiO1xuZXhwb3J0IHsgdGVtcGxhdGVzIH0gZnJvbSBcIi4vY29udGFpbmVycy50c1wiO1xuZXhwb3J0IHtcbiAgY29uZmlnLFxuICBjb25maWcgYXMgZGVmYXVsdENvbmZpZyxcbiAgY29uZmlndXJlLFxuICBnZXRDb25maWcsXG59IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFCQUFxQixHQUNyQixTQUFTLGlCQUFpQixRQUFRLG1CQUFtQixDQUFDO0FBQ3RELFNBQVMsTUFBTSxRQUFRLGFBQWEsQ0FBQztBQUVyQyxNQUFNLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBRTFCLFNBQ0UsUUFBUSxFQUNSLFVBQVUsRUFDVixVQUFVLElBQUksU0FBUyxFQUN2QixlQUFlLFFBQ1Ysb0JBQW9CLENBQUM7QUFFNUIsa0JBQWtCLEdBRWxCLFNBQVMsT0FBTyxJQUFJLGVBQWUsUUFBUSxxQkFBcUIsQ0FBQztBQUNqRSxTQUFTLE9BQU8sSUFBSSxPQUFPLFFBQVEsY0FBYyxDQUFDO0FBQ2xELFNBQVMsT0FBTyxJQUFJLEtBQUssUUFBUSxZQUFZLENBQUM7QUFDOUMsU0FBUyxPQUFPLElBQUksTUFBTSxFQUFFLFdBQVcsUUFBUSxhQUFhLENBQUM7QUFDN0QsU0FBUyxTQUFTLFFBQVEsaUJBQWlCLENBQUM7QUFDNUMsU0FDRSxNQUFNLEVBQ04sTUFBTSxJQUFJLGFBQWEsRUFDdkIsU0FBUyxFQUNULFNBQVMsUUFDSixhQUFhLENBQUMifQ==