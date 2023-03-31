import { includeFile } from "./file-handlers.ts";
/* END TYPES */ /**
 * Called with `includeFile(path, data)`
 */ export function includeFileHelper(path, data) {
    const templateAndConfig = includeFile(path, this);
    return templateAndConfig[0](data, templateAndConfig[1]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXRhQHYyLjAuMS9maWxlLWhlbHBlcnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5jbHVkZUZpbGUgfSBmcm9tIFwiLi9maWxlLWhhbmRsZXJzLnRzXCI7XG5cbi8qIFRZUEVTICovXG5cbmltcG9ydCB0eXBlIHsgRXRhQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmludGVyZmFjZSBHZW5lcmljRGF0YSB7XG4gIFtpbmRleDogc3RyaW5nXTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbn1cblxuLyogRU5EIFRZUEVTICovXG5cbi8qKlxuICogQ2FsbGVkIHdpdGggYGluY2x1ZGVGaWxlKHBhdGgsIGRhdGEpYFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBpbmNsdWRlRmlsZUhlbHBlcihcbiAgdGhpczogRXRhQ29uZmlnLFxuICBwYXRoOiBzdHJpbmcsXG4gIGRhdGE6IEdlbmVyaWNEYXRhLFxuKTogc3RyaW5nIHtcbiAgY29uc3QgdGVtcGxhdGVBbmRDb25maWcgPSBpbmNsdWRlRmlsZShwYXRoLCB0aGlzKTtcbiAgcmV0dXJuIHRlbXBsYXRlQW5kQ29uZmlnWzBdKGRhdGEsIHRlbXBsYXRlQW5kQ29uZmlnWzFdKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLFdBQVcsUUFBUSxvQkFBb0IsQ0FBQztBQVVqRCxhQUFhLEdBRWI7O0NBRUMsR0FFRCxPQUFPLFNBQVMsaUJBQWlCLENBRS9CLElBQVksRUFDWixJQUFpQixFQUNUO0lBQ1IsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxBQUFDO0lBQ2xELE9BQU8saUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyJ9