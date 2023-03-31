// TODO: allow '-' to trim up until newline. Use [^\S\n\r] instead of \s
// TODO: only include trimLeft polyfill if not in ES6
import { trimLeft, trimRight } from "./polyfills.ts";
/* END TYPES */ export function hasOwnProp(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
export function copyProps(toObj, fromObj) {
    for(const key in fromObj){
        if (hasOwnProp(fromObj, key)) {
            toObj[key] = fromObj[key];
        }
    }
    return toObj;
}
/**
 * Takes a string within a template and trims it, based on the preceding tag's whitespace control and `config.autoTrim`
 */ function trimWS(str, config, wsLeft, wsRight) {
    let leftTrim;
    let rightTrim;
    if (Array.isArray(config.autoTrim)) {
        // kinda confusing
        // but _}} will trim the left side of the following string
        leftTrim = config.autoTrim[1];
        rightTrim = config.autoTrim[0];
    } else {
        leftTrim = rightTrim = config.autoTrim;
    }
    if (wsLeft || wsLeft === false) {
        leftTrim = wsLeft;
    }
    if (wsRight || wsRight === false) {
        rightTrim = wsRight;
    }
    if (!rightTrim && !leftTrim) {
        return str;
    }
    if (leftTrim === "slurp" && rightTrim === "slurp") {
        return str.trim();
    }
    if (leftTrim === "_" || leftTrim === "slurp") {
        // console.log('trimming left' + leftTrim)
        // full slurp
        str = trimLeft(str);
    } else if (leftTrim === "-" || leftTrim === "nl") {
        // nl trim
        str = str.replace(/^(?:\r\n|\n|\r)/, "");
    }
    if (rightTrim === "_" || rightTrim === "slurp") {
        // full slurp
        str = trimRight(str);
    } else if (rightTrim === "-" || rightTrim === "nl") {
        // nl trim
        str = str.replace(/(?:\r\n|\n|\r)$/, ""); // TODO: make sure this gets \r\n
    }
    return str;
}
/**
 * A map of special HTML characters to their XML-escaped equivalents
 */ const escMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};
function replaceChar(s) {
    return escMap[s];
}
/**
 * XML-escapes an input value after converting it to a string
 *
 * @param str - Input value (usually a string)
 * @returns XML-escaped string
 */ function XMLEscape(str) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    // To deal with XSS. Based on Escape implementations of Mustache.JS and Marko, then customized.
    const newStr = String(str);
    if (/[&<>"']/.test(newStr)) {
        return newStr.replace(/[&<>"']/g, replaceChar);
    } else {
        return newStr;
    }
}
export { trimWS, XMLEscape };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXRhQHYyLjAuMS91dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUT0RPOiBhbGxvdyAnLScgdG8gdHJpbSB1cCB1bnRpbCBuZXdsaW5lLiBVc2UgW15cXFNcXG5cXHJdIGluc3RlYWQgb2YgXFxzXG4vLyBUT0RPOiBvbmx5IGluY2x1ZGUgdHJpbUxlZnQgcG9seWZpbGwgaWYgbm90IGluIEVTNlxuXG5pbXBvcnQgeyB0cmltTGVmdCwgdHJpbVJpZ2h0IH0gZnJvbSBcIi4vcG9seWZpbGxzLnRzXCI7XG5cbi8qIFRZUEVTICovXG5cbmltcG9ydCB0eXBlIHsgRXRhQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmludGVyZmFjZSBFc2NhcGVNYXAge1xuICBcIiZcIjogXCImYW1wO1wiO1xuICBcIjxcIjogXCImbHQ7XCI7XG4gIFwiPlwiOiBcIiZndDtcIjtcbiAgJ1wiJzogXCImcXVvdDtcIjtcbiAgXCInXCI6IFwiJiMzOTtcIjtcbiAgW2luZGV4OiBzdHJpbmddOiBzdHJpbmc7XG59XG5cbi8qIEVORCBUWVBFUyAqL1xuXG5leHBvcnQgZnVuY3Rpb24gaGFzT3duUHJvcChvYmo6IG9iamVjdCwgcHJvcDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlQcm9wczxUPih0b09iajogVCwgZnJvbU9iajogVCk6IFQge1xuICBmb3IgKGNvbnN0IGtleSBpbiBmcm9tT2JqKSB7XG4gICAgaWYgKGhhc093blByb3AoZnJvbU9iaiBhcyB1bmtub3duIGFzIG9iamVjdCwga2V5KSkge1xuICAgICAgdG9PYmpba2V5XSA9IGZyb21PYmpba2V5XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvT2JqO1xufVxuXG4vKipcbiAqIFRha2VzIGEgc3RyaW5nIHdpdGhpbiBhIHRlbXBsYXRlIGFuZCB0cmltcyBpdCwgYmFzZWQgb24gdGhlIHByZWNlZGluZyB0YWcncyB3aGl0ZXNwYWNlIGNvbnRyb2wgYW5kIGBjb25maWcuYXV0b1RyaW1gXG4gKi9cblxuZnVuY3Rpb24gdHJpbVdTKFxuICBzdHI6IHN0cmluZyxcbiAgY29uZmlnOiBFdGFDb25maWcsXG4gIHdzTGVmdDogc3RyaW5nIHwgZmFsc2UsXG4gIHdzUmlnaHQ/OiBzdHJpbmcgfCBmYWxzZSxcbik6IHN0cmluZyB7XG4gIGxldCBsZWZ0VHJpbTtcbiAgbGV0IHJpZ2h0VHJpbTtcblxuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcuYXV0b1RyaW0pKSB7XG4gICAgLy8ga2luZGEgY29uZnVzaW5nXG4gICAgLy8gYnV0IF99fSB3aWxsIHRyaW0gdGhlIGxlZnQgc2lkZSBvZiB0aGUgZm9sbG93aW5nIHN0cmluZ1xuICAgIGxlZnRUcmltID0gY29uZmlnLmF1dG9UcmltWzFdO1xuICAgIHJpZ2h0VHJpbSA9IGNvbmZpZy5hdXRvVHJpbVswXTtcbiAgfSBlbHNlIHtcbiAgICBsZWZ0VHJpbSA9IHJpZ2h0VHJpbSA9IGNvbmZpZy5hdXRvVHJpbTtcbiAgfVxuXG4gIGlmICh3c0xlZnQgfHwgd3NMZWZ0ID09PSBmYWxzZSkge1xuICAgIGxlZnRUcmltID0gd3NMZWZ0O1xuICB9XG5cbiAgaWYgKHdzUmlnaHQgfHwgd3NSaWdodCA9PT0gZmFsc2UpIHtcbiAgICByaWdodFRyaW0gPSB3c1JpZ2h0O1xuICB9XG5cbiAgaWYgKCFyaWdodFRyaW0gJiYgIWxlZnRUcmltKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIGlmIChsZWZ0VHJpbSA9PT0gXCJzbHVycFwiICYmIHJpZ2h0VHJpbSA9PT0gXCJzbHVycFwiKSB7XG4gICAgcmV0dXJuIHN0ci50cmltKCk7XG4gIH1cblxuICBpZiAobGVmdFRyaW0gPT09IFwiX1wiIHx8IGxlZnRUcmltID09PSBcInNsdXJwXCIpIHtcbiAgICAvLyBjb25zb2xlLmxvZygndHJpbW1pbmcgbGVmdCcgKyBsZWZ0VHJpbSlcbiAgICAvLyBmdWxsIHNsdXJwXG5cbiAgICBzdHIgPSB0cmltTGVmdChzdHIpO1xuICB9IGVsc2UgaWYgKGxlZnRUcmltID09PSBcIi1cIiB8fCBsZWZ0VHJpbSA9PT0gXCJubFwiKSB7XG4gICAgLy8gbmwgdHJpbVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9eKD86XFxyXFxufFxcbnxcXHIpLywgXCJcIik7XG4gIH1cblxuICBpZiAocmlnaHRUcmltID09PSBcIl9cIiB8fCByaWdodFRyaW0gPT09IFwic2x1cnBcIikge1xuICAgIC8vIGZ1bGwgc2x1cnBcbiAgICBzdHIgPSB0cmltUmlnaHQoc3RyKTtcbiAgfSBlbHNlIGlmIChyaWdodFRyaW0gPT09IFwiLVwiIHx8IHJpZ2h0VHJpbSA9PT0gXCJubFwiKSB7XG4gICAgLy8gbmwgdHJpbVxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC8oPzpcXHJcXG58XFxufFxccikkLywgXCJcIik7IC8vIFRPRE86IG1ha2Ugc3VyZSB0aGlzIGdldHMgXFxyXFxuXG4gIH1cblxuICByZXR1cm4gc3RyO1xufVxuXG4vKipcbiAqIEEgbWFwIG9mIHNwZWNpYWwgSFRNTCBjaGFyYWN0ZXJzIHRvIHRoZWlyIFhNTC1lc2NhcGVkIGVxdWl2YWxlbnRzXG4gKi9cblxuY29uc3QgZXNjTWFwOiBFc2NhcGVNYXAgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImIzM5O1wiLFxufTtcblxuZnVuY3Rpb24gcmVwbGFjZUNoYXIoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVzY01hcFtzXTtcbn1cblxuLyoqXG4gKiBYTUwtZXNjYXBlcyBhbiBpbnB1dCB2YWx1ZSBhZnRlciBjb252ZXJ0aW5nIGl0IHRvIGEgc3RyaW5nXG4gKlxuICogQHBhcmFtIHN0ciAtIElucHV0IHZhbHVlICh1c3VhbGx5IGEgc3RyaW5nKVxuICogQHJldHVybnMgWE1MLWVzY2FwZWQgc3RyaW5nXG4gKi9cblxuZnVuY3Rpb24gWE1MRXNjYXBlKHN0cjogYW55KTogc3RyaW5nIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIC8vIFRvIGRlYWwgd2l0aCBYU1MuIEJhc2VkIG9uIEVzY2FwZSBpbXBsZW1lbnRhdGlvbnMgb2YgTXVzdGFjaGUuSlMgYW5kIE1hcmtvLCB0aGVuIGN1c3RvbWl6ZWQuXG4gIGNvbnN0IG5ld1N0ciA9IFN0cmluZyhzdHIpO1xuICBpZiAoL1smPD5cIiddLy50ZXN0KG5ld1N0cikpIHtcbiAgICByZXR1cm4gbmV3U3RyLnJlcGxhY2UoL1smPD5cIiddL2csIHJlcGxhY2VDaGFyKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3U3RyO1xuICB9XG59XG5cbmV4cG9ydCB7IHRyaW1XUywgWE1MRXNjYXBlIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsd0VBQXdFO0FBQ3hFLHFEQUFxRDtBQUVyRCxTQUFTLFFBQVEsRUFBRSxTQUFTLFFBQVEsZ0JBQWdCLENBQUM7QUFlckQsYUFBYSxHQUViLE9BQU8sU0FBUyxVQUFVLENBQUMsR0FBVyxFQUFFLElBQVksRUFBVztJQUM3RCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUVELE9BQU8sU0FBUyxTQUFTLENBQUksS0FBUSxFQUFFLE9BQVUsRUFBSztJQUNwRCxJQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBRTtRQUN6QixJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQXVCLEdBQUcsQ0FBQyxFQUFFO1lBQ2pELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLEtBQUssQ0FB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