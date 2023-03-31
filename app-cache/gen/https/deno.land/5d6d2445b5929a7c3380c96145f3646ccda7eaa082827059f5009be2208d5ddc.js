import { ParseErr } from "./err.ts";
import { trimWS } from "./utils.ts";
/* END TYPES */ const templateLitReg = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
const singleQuoteReg = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
const doubleQuoteReg = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;
/** Escape special regular expression characters inside a string */ function escapeRegExp(string) {
    // From MDN
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
export default function parse(str, config) {
    let buffer = [];
    let trimLeftOfNextStr = false;
    let lastIndex = 0;
    const parseOptions = config.parse;
    if (config.plugins) {
        for(let i = 0; i < config.plugins.length; i++){
            const plugin = config.plugins[i];
            if (plugin.processTemplate) {
                str = plugin.processTemplate(str, config);
            }
        }
    }
    /* Adding for EJS compatibility */ if (config.rmWhitespace) {
        // Code taken directly from EJS
        // Have to use two separate replaces here as `^` and `$` operators don't
        // work well with `\r` and empty lines don't work well with the `m` flag.
        // Essentially, this replaces the whitespace at the beginning and end of
        // each line and removes multiple newlines.
        str = str.replace(/[\r\n]+/g, "\n").replace(/^\s+|\s+$/gm, "");
    }
    /* End rmWhitespace option */ templateLitReg.lastIndex = 0;
    singleQuoteReg.lastIndex = 0;
    doubleQuoteReg.lastIndex = 0;
    function pushString(strng, shouldTrimRightOfString) {
        if (strng) {
            // if string is truthy it must be of type 'string'
            strng = trimWS(strng, config, trimLeftOfNextStr, shouldTrimRightOfString);
            if (strng) {
                // replace \ with \\, ' with \'
                // we're going to convert all CRLF to LF so it doesn't take more than one replace
                strng = strng.replace(/\\|'/g, "\\$&").replace(/\r\n|\n|\r/g, "\\n");
                buffer.push(strng);
            }
        }
    }
    const prefixes = [
        parseOptions.exec,
        parseOptions.interpolate,
        parseOptions.raw, 
    ].reduce(function(accumulator, prefix) {
        if (accumulator && prefix) {
            return accumulator + "|" + escapeRegExp(prefix);
        } else if (prefix) {
            // accumulator is falsy
            return escapeRegExp(prefix);
        } else {
            // prefix and accumulator are both falsy
            return accumulator;
        }
    }, "");
    const parseOpenReg = new RegExp("([^]*?)" + escapeRegExp(config.tags[0]) + "(-|_)?\\s*(" + prefixes + ")?\\s*", "g");
    const parseCloseReg = new RegExp("'|\"|`|\\/\\*|(\\s*(-|_)?" + escapeRegExp(config.tags[1]) + ")", "g");
    // TODO: benchmark having the \s* on either side vs using str.trim()
    let m;
    while(m = parseOpenReg.exec(str)){
        lastIndex = m[0].length + m.index;
        const precedingString = m[1];
        const wsLeft = m[2];
        const prefix = m[3] || ""; // by default either ~, =, or empty
        pushString(precedingString, wsLeft);
        parseCloseReg.lastIndex = lastIndex;
        let closeTag;
        let currentObj = false;
        while(closeTag = parseCloseReg.exec(str)){
            if (closeTag[1]) {
                const content = str.slice(lastIndex, closeTag.index);
                parseOpenReg.lastIndex = lastIndex = parseCloseReg.lastIndex;
                trimLeftOfNextStr = closeTag[2];
                const currentType = prefix === parseOptions.exec ? "e" : prefix === parseOptions.raw ? "r" : prefix === parseOptions.interpolate ? "i" : "";
                currentObj = {
                    t: currentType,
                    val: content
                };
                break;
            } else {
                const char = closeTag[0];
                if (char === "/*") {
                    const commentCloseInd = str.indexOf("*/", parseCloseReg.lastIndex);
                    if (commentCloseInd === -1) {
                        ParseErr("unclosed comment", str, closeTag.index);
                    }
                    parseCloseReg.lastIndex = commentCloseInd;
                } else if (char === "'") {
                    singleQuoteReg.lastIndex = closeTag.index;
                    const singleQuoteMatch = singleQuoteReg.exec(str);
                    if (singleQuoteMatch) {
                        parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
                    } else {
                        ParseErr("unclosed string", str, closeTag.index);
                    }
                } else if (char === '"') {
                    doubleQuoteReg.lastIndex = closeTag.index;
                    const doubleQuoteMatch = doubleQuoteReg.exec(str);
                    if (doubleQuoteMatch) {
                        parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
                    } else {
                        ParseErr("unclosed string", str, closeTag.index);
                    }
                } else if (char === "`") {
                    templateLitReg.lastIndex = closeTag.index;
                    const templateLitMatch = templateLitReg.exec(str);
                    if (templateLitMatch) {
                        parseCloseReg.lastIndex = templateLitReg.lastIndex;
                    } else {
                        ParseErr("unclosed string", str, closeTag.index);
                    }
                }
            }
        }
        if (currentObj) {
            buffer.push(currentObj);
        } else {
            ParseErr("unclosed tag", str, m.index + precedingString.length);
        }
    }
    pushString(str.slice(lastIndex, str.length), false);
    if (config.plugins) {
        for(let i1 = 0; i1 < config.plugins.length; i1++){
            const plugin1 = config.plugins[i1];
            if (plugin1.processAST) {
                buffer = plugin1.processAST(buffer, config);
            }
        }
    }
    return buffer;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXRhQHYyLjAuMS9wYXJzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXJzZUVyciB9IGZyb20gXCIuL2Vyci50c1wiO1xuaW1wb3J0IHsgdHJpbVdTIH0gZnJvbSBcIi4vdXRpbHMudHNcIjtcblxuLyogVFlQRVMgKi9cblxuaW1wb3J0IHR5cGUgeyBFdGFDb25maWcgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuZXhwb3J0IHR5cGUgVGFnVHlwZSA9IFwiclwiIHwgXCJlXCIgfCBcImlcIiB8IFwiXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVPYmplY3Qge1xuICB0OiBUYWdUeXBlO1xuICB2YWw6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgQXN0T2JqZWN0ID0gc3RyaW5nIHwgVGVtcGxhdGVPYmplY3Q7XG5cbi8qIEVORCBUWVBFUyAqL1xuXG5jb25zdCB0ZW1wbGF0ZUxpdFJlZyA9XG4gIC9gKD86XFxcXFtcXHNcXFNdfFxcJHsoPzpbXnt9XXx7KD86W157fV18e1tefV0qfSkqfSkqfXwoPyFcXCR7KVteXFxcXGBdKSpgL2c7XG5cbmNvbnN0IHNpbmdsZVF1b3RlUmVnID0gLycoPzpcXFxcW1xcc1xcd1wiJ1xcXFxgXXxbXlxcblxccidcXFxcXSkqPycvZztcblxuY29uc3QgZG91YmxlUXVvdGVSZWcgPSAvXCIoPzpcXFxcW1xcc1xcd1wiJ1xcXFxgXXxbXlxcblxcclwiXFxcXF0pKj9cIi9nO1xuXG4vKiogRXNjYXBlIHNwZWNpYWwgcmVndWxhciBleHByZXNzaW9uIGNoYXJhY3RlcnMgaW5zaWRlIGEgc3RyaW5nICovXG5cbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChzdHJpbmc6IHN0cmluZykge1xuICAvLyBGcm9tIE1ETlxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKitcXC0/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTsgLy8gJCYgbWVhbnMgdGhlIHdob2xlIG1hdGNoZWQgc3RyaW5nXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBhcnNlKFxuICBzdHI6IHN0cmluZyxcbiAgY29uZmlnOiBFdGFDb25maWcsXG4pOiBBcnJheTxBc3RPYmplY3Q+IHtcbiAgbGV0IGJ1ZmZlcjogQXJyYXk8QXN0T2JqZWN0PiA9IFtdO1xuICBsZXQgdHJpbUxlZnRPZk5leHRTdHI6IHN0cmluZyB8IGZhbHNlID0gZmFsc2U7XG4gIGxldCBsYXN0SW5kZXggPSAwO1xuICBjb25zdCBwYXJzZU9wdGlvbnMgPSBjb25maWcucGFyc2U7XG5cbiAgaWYgKGNvbmZpZy5wbHVnaW5zKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb25maWcucGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcGx1Z2luID0gY29uZmlnLnBsdWdpbnNbaV07XG4gICAgICBpZiAocGx1Z2luLnByb2Nlc3NUZW1wbGF0ZSkge1xuICAgICAgICBzdHIgPSBwbHVnaW4ucHJvY2Vzc1RlbXBsYXRlKHN0ciwgY29uZmlnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiBBZGRpbmcgZm9yIEVKUyBjb21wYXRpYmlsaXR5ICovXG4gIGlmIChjb25maWcucm1XaGl0ZXNwYWNlKSB7XG4gICAgLy8gQ29kZSB0YWtlbiBkaXJlY3RseSBmcm9tIEVKU1xuICAgIC8vIEhhdmUgdG8gdXNlIHR3byBzZXBhcmF0ZSByZXBsYWNlcyBoZXJlIGFzIGBeYCBhbmQgYCRgIG9wZXJhdG9ycyBkb24ndFxuICAgIC8vIHdvcmsgd2VsbCB3aXRoIGBcXHJgIGFuZCBlbXB0eSBsaW5lcyBkb24ndCB3b3JrIHdlbGwgd2l0aCB0aGUgYG1gIGZsYWcuXG4gICAgLy8gRXNzZW50aWFsbHksIHRoaXMgcmVwbGFjZXMgdGhlIHdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mXG4gICAgLy8gZWFjaCBsaW5lIGFuZCByZW1vdmVzIG11bHRpcGxlIG5ld2xpbmVzLlxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKC9bXFxyXFxuXSsvZywgXCJcXG5cIikucmVwbGFjZSgvXlxccyt8XFxzKyQvZ20sIFwiXCIpO1xuICB9XG4gIC8qIEVuZCBybVdoaXRlc3BhY2Ugb3B0aW9uICovXG5cbiAgdGVtcGxhdGVMaXRSZWcubGFzdEluZGV4ID0gMDtcbiAgc2luZ2xlUXVvdGVSZWcubGFzdEluZGV4ID0gMDtcbiAgZG91YmxlUXVvdGVSZWcubGFzdEluZGV4ID0gMDtcblxuICBmdW5jdGlvbiBwdXNoU3RyaW5nKHN0cm5nOiBzdHJpbmcsIHNob3VsZFRyaW1SaWdodE9mU3RyaW5nPzogc3RyaW5nIHwgZmFsc2UpIHtcbiAgICBpZiAoc3RybmcpIHtcbiAgICAgIC8vIGlmIHN0cmluZyBpcyB0cnV0aHkgaXQgbXVzdCBiZSBvZiB0eXBlICdzdHJpbmcnXG5cbiAgICAgIHN0cm5nID0gdHJpbVdTKFxuICAgICAgICBzdHJuZyxcbiAgICAgICAgY29uZmlnLFxuICAgICAgICB0cmltTGVmdE9mTmV4dFN0ciwgLy8gdGhpcyB3aWxsIG9ubHkgYmUgZmFsc2Ugb24gdGhlIGZpcnN0IHN0ciwgdGhlIG5leHQgb25lcyB3aWxsIGJlIG51bGwgb3IgdW5kZWZpbmVkXG4gICAgICAgIHNob3VsZFRyaW1SaWdodE9mU3RyaW5nLFxuICAgICAgKTtcblxuICAgICAgaWYgKHN0cm5nKSB7XG4gICAgICAgIC8vIHJlcGxhY2UgXFwgd2l0aCBcXFxcLCAnIHdpdGggXFwnXG4gICAgICAgIC8vIHdlJ3JlIGdvaW5nIHRvIGNvbnZlcnQgYWxsIENSTEYgdG8gTEYgc28gaXQgZG9lc24ndCB0YWtlIG1vcmUgdGhhbiBvbmUgcmVwbGFjZVxuXG4gICAgICAgIHN0cm5nID0gc3RybmcucmVwbGFjZSgvXFxcXHwnL2csIFwiXFxcXCQmXCIpLnJlcGxhY2UoL1xcclxcbnxcXG58XFxyL2csIFwiXFxcXG5cIik7XG5cbiAgICAgICAgYnVmZmVyLnB1c2goc3RybmcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHByZWZpeGVzID0gW1xuICAgIHBhcnNlT3B0aW9ucy5leGVjLFxuICAgIHBhcnNlT3B0aW9ucy5pbnRlcnBvbGF0ZSxcbiAgICBwYXJzZU9wdGlvbnMucmF3LFxuICBdLnJlZHVjZShmdW5jdGlvbiAoXG4gICAgYWNjdW11bGF0b3IsXG4gICAgcHJlZml4LFxuICApIHtcbiAgICBpZiAoYWNjdW11bGF0b3IgJiYgcHJlZml4KSB7XG4gICAgICByZXR1cm4gYWNjdW11bGF0b3IgKyBcInxcIiArIGVzY2FwZVJlZ0V4cChwcmVmaXgpO1xuICAgIH0gZWxzZSBpZiAocHJlZml4KSB7XG4gICAgICAvLyBhY2N1bXVsYXRvciBpcyBmYWxzeVxuICAgICAgcmV0dXJuIGVzY2FwZVJlZ0V4cChwcmVmaXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBwcmVmaXggYW5kIGFjY3VtdWxhdG9yIGFyZSBib3RoIGZhbHN5XG4gICAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgfVxuICB9LCBcIlwiKTtcblxuICBjb25zdCBwYXJzZU9wZW5SZWcgPSBuZXcgUmVnRXhwKFxuICAgIFwiKFteXSo/KVwiICsgZXNjYXBlUmVnRXhwKGNvbmZpZy50YWdzWzBdKSArIFwiKC18Xyk/XFxcXHMqKFwiICsgcHJlZml4ZXMgK1xuICAgICAgXCIpP1xcXFxzKlwiLFxuICAgIFwiZ1wiLFxuICApO1xuXG4gIGNvbnN0IHBhcnNlQ2xvc2VSZWcgPSBuZXcgUmVnRXhwKFxuICAgIFwiJ3xcXFwifGB8XFxcXC9cXFxcKnwoXFxcXHMqKC18Xyk/XCIgKyBlc2NhcGVSZWdFeHAoY29uZmlnLnRhZ3NbMV0pICsgXCIpXCIsXG4gICAgXCJnXCIsXG4gICk7XG4gIC8vIFRPRE86IGJlbmNobWFyayBoYXZpbmcgdGhlIFxccyogb24gZWl0aGVyIHNpZGUgdnMgdXNpbmcgc3RyLnRyaW0oKVxuXG4gIGxldCBtO1xuXG4gIHdoaWxlICgobSA9IHBhcnNlT3BlblJlZy5leGVjKHN0cikpKSB7XG4gICAgbGFzdEluZGV4ID0gbVswXS5sZW5ndGggKyBtLmluZGV4O1xuXG4gICAgY29uc3QgcHJlY2VkaW5nU3RyaW5nID0gbVsxXTtcbiAgICBjb25zdCB3c0xlZnQgPSBtWzJdO1xuICAgIGNvbnN0IHByZWZpeCA9IG1bM10gfHwgXCJcIjsgLy8gYnkgZGVmYXVsdCBlaXRoZXIgfiwgPSwgb3IgZW1wdHlcblxuICAgIHB1c2hTdHJpbmcocHJlY2VkaW5nU3RyaW5nLCB3c0xlZnQpO1xuXG4gICAgcGFyc2VDbG9zZVJlZy5sYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgbGV0IGNsb3NlVGFnO1xuICAgIGxldCBjdXJyZW50T2JqOiBBc3RPYmplY3QgfCBmYWxzZSA9IGZhbHNlO1xuXG4gICAgd2hpbGUgKChjbG9zZVRhZyA9IHBhcnNlQ2xvc2VSZWcuZXhlYyhzdHIpKSkge1xuICAgICAgaWYgKGNsb3NlVGFnWzFdKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBzdHIuc2xpY2UobGFzdEluZGV4LCBjbG9zZVRhZy5pbmRleCk7XG5cbiAgICAgICAgcGFyc2VPcGVuUmVnLmxhc3RJbmRleCA9IGxhc3RJbmRleCA9IHBhcnNlQ2xvc2VSZWcubGFzdEluZGV4O1xuXG4gICAgICAgIHRyaW1MZWZ0T2ZOZXh0U3RyID0gY2xvc2VUYWdbMl07XG5cbiAgICAgICAgY29uc3QgY3VycmVudFR5cGU6IFRhZ1R5cGUgPSBwcmVmaXggPT09IHBhcnNlT3B0aW9ucy5leGVjXG4gICAgICAgICAgPyBcImVcIlxuICAgICAgICAgIDogcHJlZml4ID09PSBwYXJzZU9wdGlvbnMucmF3XG4gICAgICAgICAgPyBcInJcIlxuICAgICAgICAgIDogcHJlZml4ID09PSBwYXJzZU9wdGlvbnMuaW50ZXJwb2xhdGVcbiAgICAgICAgICA/IFwiaVwiXG4gICAgICAgICAgOiBcIlwiO1xuXG4gICAgICAgIGN1cnJlbnRPYmogPSB7IHQ6IGN1cnJlbnRUeXBlLCB2YWw6IGNvbnRlbnQgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjaGFyID0gY2xvc2VUYWdbMF07XG4gICAgICAgIGlmIChjaGFyID09PSBcIi8qXCIpIHtcbiAgICAgICAgICBjb25zdCBjb21tZW50Q2xvc2VJbmQgPSBzdHIuaW5kZXhPZihcIiovXCIsIHBhcnNlQ2xvc2VSZWcubGFzdEluZGV4KTtcblxuICAgICAgICAgIGlmIChjb21tZW50Q2xvc2VJbmQgPT09IC0xKSB7XG4gICAgICAgICAgICBQYXJzZUVycihcInVuY2xvc2VkIGNvbW1lbnRcIiwgc3RyLCBjbG9zZVRhZy5pbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcnNlQ2xvc2VSZWcubGFzdEluZGV4ID0gY29tbWVudENsb3NlSW5kO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYXIgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgc2luZ2xlUXVvdGVSZWcubGFzdEluZGV4ID0gY2xvc2VUYWcuaW5kZXg7XG5cbiAgICAgICAgICBjb25zdCBzaW5nbGVRdW90ZU1hdGNoID0gc2luZ2xlUXVvdGVSZWcuZXhlYyhzdHIpO1xuICAgICAgICAgIGlmIChzaW5nbGVRdW90ZU1hdGNoKSB7XG4gICAgICAgICAgICBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCA9IHNpbmdsZVF1b3RlUmVnLmxhc3RJbmRleDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGFyc2VFcnIoXCJ1bmNsb3NlZCBzdHJpbmdcIiwgc3RyLCBjbG9zZVRhZy5pbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICdcIicpIHtcbiAgICAgICAgICBkb3VibGVRdW90ZVJlZy5sYXN0SW5kZXggPSBjbG9zZVRhZy5pbmRleDtcbiAgICAgICAgICBjb25zdCBkb3VibGVRdW90ZU1hdGNoID0gZG91YmxlUXVvdGVSZWcuZXhlYyhzdHIpO1xuXG4gICAgICAgICAgaWYgKGRvdWJsZVF1b3RlTWF0Y2gpIHtcbiAgICAgICAgICAgIHBhcnNlQ2xvc2VSZWcubGFzdEluZGV4ID0gZG91YmxlUXVvdGVSZWcubGFzdEluZGV4O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBQYXJzZUVycihcInVuY2xvc2VkIHN0cmluZ1wiLCBzdHIsIGNsb3NlVGFnLmluZGV4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gXCJgXCIpIHtcbiAgICAgICAgICB0ZW1wbGF0ZUxpdFJlZy5sYXN0SW5kZXggPSBjbG9zZVRhZy5pbmRleDtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZUxpdE1hdGNoID0gdGVtcGxhdGVMaXRSZWcuZXhlYyhzdHIpO1xuICAgICAgICAgIGlmICh0ZW1wbGF0ZUxpdE1hdGNoKSB7XG4gICAgICAgICAgICBwYXJzZUNsb3NlUmVnLmxhc3RJbmRleCA9IHRlbXBsYXRlTGl0UmVnLmxhc3RJbmRleDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGFyc2VFcnIoXCJ1bmNsb3NlZCBzdHJpbmdcIiwgc3RyLCBjbG9zZVRhZy5pbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjdXJyZW50T2JqKSB7XG4gICAgICBidWZmZXIucHVzaChjdXJyZW50T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgUGFyc2VFcnIoXCJ1bmNsb3NlZCB0YWdcIiwgc3RyLCBtLmluZGV4ICsgcHJlY2VkaW5nU3RyaW5nLmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgcHVzaFN0cmluZyhzdHIuc2xpY2UobGFzdEluZGV4LCBzdHIubGVuZ3RoKSwgZmFsc2UpO1xuXG4gIGlmIChjb25maWcucGx1Z2lucykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLnBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHBsdWdpbiA9IGNvbmZpZy5wbHVnaW5zW2ldO1xuICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzQVNUKSB7XG4gICAgICAgIGJ1ZmZlciA9IHBsdWdpbi5wcm9jZXNzQVNUKGJ1ZmZlciwgY29uZmlnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmZmVyO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsUUFBUSxRQUFRLFVBQVUsQ0FBQztBQUNwQyxTQUFTLE1BQU0sUUFBUSxZQUFZLENBQUM7QUFlcEMsYUFBYSxHQUViLE1BQU0sY0FBYyx1RUFDa0QsQUFBQztBQUV2RSxNQUFNLGNBQWMsc0NBQXNDLEFBQUM7QUFFM0QsTUFBTSxjQUFjLHNDQUFzQyxBQUFDO0FBRTNELGlFQUFpRSxHQUVqRSxTQUFTLFlBQVksQ0FBQyxNQUFjLEVBQUU7SUFDcEMsV0FBVztJQUNYLE9BQU8sTUFBTSxDQUFDLE9BQU8sMEJBQTBCLE1BQU0sQ0FBQyxDQUFDLENBQUMsb0NBQW9DO0FBQzlGLENBQUM7QUFFRCxlQUFlLFNBQVMsS0FBSyxDQUMzQixHQUFXLEVBQ1gsTUFBaUIsRUFDQztJQUNsQixJQUFJLE1BQU0sR0FBcUIsRUFBRSxBQUFDO0lBQ2xDLElBQUksaUJBQWlCLEdBQW1CLEtBQUssQUFBQztJQUM5QyxJQUFJLFNBQVMsR0FBRyxDQUFDLEFBQUM7SUFDbEIsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLEtBQUssQUFBQztJQUVsQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7UUFDbEIsSUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO1lBQzlDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEFBQUM7WUFDakMsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFO2dCQUMxQixHQUFHLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBRUQsZ0NBQWdDLEdBQ2hDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRTtRQUN2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