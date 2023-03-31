// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
/*!
 * Adapted directly from negotiator at https://github.com/jshttp/negotiator/
 * which is licensed as follows:
 *
 * (The MIT License)
 *
 * Copyright (c) 2012-2014 Federico Romero
 * Copyright (c) 2012-2014 Isaac Z. Schlueter
 * Copyright (c) 2014-2015 Douglas Christopher Wilson
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */ import { compareSpecs, isQuality } from "./common.ts";
const simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
function quoteCount(str) {
    let count = 0;
    let index = 0;
    while((index = str.indexOf(`"`, index)) !== -1){
        count++;
        index++;
    }
    return count;
}
function splitMediaTypes(accept) {
    const accepts = accept.split(",");
    let j = 0;
    for(let i = 1; i < accepts.length; i++){
        if (quoteCount(accepts[j]) % 2 === 0) {
            accepts[++j] = accepts[i];
        } else {
            accepts[j] += `,${accepts[i]}`;
        }
    }
    accepts.length = j + 1;
    return accepts;
}
function splitParameters(str) {
    const parameters = str.split(";");
    let j = 0;
    for(let i = 1; i < parameters.length; i++){
        if (quoteCount(parameters[j]) % 2 === 0) {
            parameters[++j] = parameters[i];
        } else {
            parameters[j] += `;${parameters[i]}`;
        }
    }
    parameters.length = j + 1;
    return parameters.map((p)=>p.trim());
}
function splitKeyValuePair(str) {
    const [key, value] = str.split("=");
    return [
        key.toLowerCase(),
        value
    ];
}
function parseMediaType(str, i) {
    const match = simpleMediaTypeRegExp.exec(str);
    if (!match) {
        return;
    }
    const params = Object.create(null);
    let q = 1;
    const [, type, subtype, parameters] = match;
    if (parameters) {
        const kvps = splitParameters(parameters).map(splitKeyValuePair);
        for (const [key, val] of kvps){
            const value = val && val[0] === `"` && val[val.length - 1] === `"` ? val.slice(1, val.length - 1) : val;
            if (key === "q" && value) {
                q = parseFloat(value);
                break;
            }
            params[key] = value;
        }
    }
    return {
        type,
        subtype,
        params,
        q,
        i
    };
}
function parseAccept(accept) {
    const accepts = splitMediaTypes(accept);
    const mediaTypes = [];
    for(let i = 0; i < accepts.length; i++){
        const mediaType = parseMediaType(accepts[i].trim(), i);
        if (mediaType) {
            mediaTypes.push(mediaType);
        }
    }
    return mediaTypes;
}
function getFullType(spec) {
    return `${spec.type}/${spec.subtype}`;
}
function specify(type, spec, index) {
    const p = parseMediaType(type, index);
    if (!p) {
        return;
    }
    let s = 0;
    if (spec.type.toLowerCase() === p.type.toLowerCase()) {
        s |= 4;
    } else if (spec.type !== "*") {
        return;
    }
    if (spec.subtype.toLowerCase() === p.subtype.toLowerCase()) {
        s |= 2;
    } else if (spec.subtype !== "*") {
        return;
    }
    const keys = Object.keys(spec.params);
    if (keys.length) {
        if (keys.every((key)=>(spec.params[key] || "").toLowerCase() === (p.params[key] || "").toLowerCase())) {
            s |= 1;
        } else {
            return;
        }
    }
    return {
        i: index,
        o: spec.o,
        q: spec.q,
        s
    };
}
function getMediaTypePriority(type, accepted, index) {
    let priority = {
        o: -1,
        q: 0,
        s: 0,
        i: index
    };
    for (const accepts of accepted){
        const spec = specify(type, accepts, index);
        if (spec && ((priority.s || 0) - (spec.s || 0) || (priority.q || 0) - (spec.q || 0) || (priority.o || 0) - (spec.o || 0)) < 0) {
            priority = spec;
        }
    }
    return priority;
}
export function preferredMediaTypes(accept, provided) {
    const accepts = parseAccept(accept === undefined ? "*/*" : accept || "");
    if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullType);
    }
    const priorities = provided.map((type, index)=>{
        return getMediaTypePriority(type, accepts, index);
    });
    return priorities.filter(isQuality).sort(compareSpecs).map((priority)=>provided[priorities.indexOf(priority)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE4MS4wL2h0dHAvX25lZ290aWF0aW9uL21lZGlhX3R5cGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMyB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8qIVxuICogQWRhcHRlZCBkaXJlY3RseSBmcm9tIG5lZ290aWF0b3IgYXQgaHR0cHM6Ly9naXRodWIuY29tL2pzaHR0cC9uZWdvdGlhdG9yL1xuICogd2hpY2ggaXMgbGljZW5zZWQgYXMgZm9sbG93czpcbiAqXG4gKiAoVGhlIE1JVCBMaWNlbnNlKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMi0yMDE0IEZlZGVyaWNvIFJvbWVyb1xuICogQ29weXJpZ2h0IChjKSAyMDEyLTIwMTQgSXNhYWMgWi4gU2NobHVldGVyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZ1xuICogYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4gKiAnU29mdHdhcmUnKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4gKiBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbiAqIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xuICogdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gKiBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgJ0FTIElTJywgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAqIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuICogTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULlxuICogSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTllcbiAqIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsXG4gKiBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRVxuICogU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKi9cblxuaW1wb3J0IHsgY29tcGFyZVNwZWNzLCBpc1F1YWxpdHksIFNwZWNpZmljaXR5IH0gZnJvbSBcIi4vY29tbW9uLnRzXCI7XG5cbmludGVyZmFjZSBNZWRpYVR5cGVTcGVjaWZpY2l0eSBleHRlbmRzIFNwZWNpZmljaXR5IHtcbiAgdHlwZTogc3RyaW5nO1xuICBzdWJ0eXBlOiBzdHJpbmc7XG4gIHBhcmFtczogeyBbcGFyYW06IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9O1xufVxuXG5jb25zdCBzaW1wbGVNZWRpYVR5cGVSZWdFeHAgPSAvXlxccyooW15cXHNcXC87XSspXFwvKFteO1xcc10rKVxccyooPzo7KC4qKSk/JC87XG5cbmZ1bmN0aW9uIHF1b3RlQ291bnQoc3RyOiBzdHJpbmcpOiBudW1iZXIge1xuICBsZXQgY291bnQgPSAwO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIHdoaWxlICgoaW5kZXggPSBzdHIuaW5kZXhPZihgXCJgLCBpbmRleCkpICE9PSAtMSkge1xuICAgIGNvdW50Kys7XG4gICAgaW5kZXgrKztcbiAgfVxuXG4gIHJldHVybiBjb3VudDtcbn1cblxuZnVuY3Rpb24gc3BsaXRNZWRpYVR5cGVzKGFjY2VwdDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBhY2NlcHRzID0gYWNjZXB0LnNwbGl0KFwiLFwiKTtcblxuICBsZXQgaiA9IDA7XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgYWNjZXB0cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChxdW90ZUNvdW50KGFjY2VwdHNbal0pICUgMiA9PT0gMCkge1xuICAgICAgYWNjZXB0c1srK2pdID0gYWNjZXB0c1tpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWNjZXB0c1tqXSArPSBgLCR7YWNjZXB0c1tpXX1gO1xuICAgIH1cbiAgfVxuXG4gIGFjY2VwdHMubGVuZ3RoID0gaiArIDE7XG5cbiAgcmV0dXJuIGFjY2VwdHM7XG59XG5cbmZ1bmN0aW9uIHNwbGl0UGFyYW1ldGVycyhzdHI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFyYW1ldGVycyA9IHN0ci5zcGxpdChcIjtcIik7XG5cbiAgbGV0IGogPSAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHBhcmFtZXRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAocXVvdGVDb3VudChwYXJhbWV0ZXJzW2pdKSAlIDIgPT09IDApIHtcbiAgICAgIHBhcmFtZXRlcnNbKytqXSA9IHBhcmFtZXRlcnNbaV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmFtZXRlcnNbal0gKz0gYDske3BhcmFtZXRlcnNbaV19YDtcbiAgICB9XG4gIH1cblxuICBwYXJhbWV0ZXJzLmxlbmd0aCA9IGogKyAxO1xuXG4gIHJldHVybiBwYXJhbWV0ZXJzLm1hcCgocCkgPT4gcC50cmltKCkpO1xufVxuXG5mdW5jdGlvbiBzcGxpdEtleVZhbHVlUGFpcihzdHI6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZF0ge1xuICBjb25zdCBba2V5LCB2YWx1ZV0gPSBzdHIuc3BsaXQoXCI9XCIpO1xuICByZXR1cm4gW2tleS50b0xvd2VyQ2FzZSgpLCB2YWx1ZV07XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWVkaWFUeXBlKFxuICBzdHI6IHN0cmluZyxcbiAgaTogbnVtYmVyLFxuKTogTWVkaWFUeXBlU3BlY2lmaWNpdHkgfCB1bmRlZmluZWQge1xuICBjb25zdCBtYXRjaCA9IHNpbXBsZU1lZGlhVHlwZVJlZ0V4cC5leGVjKHN0cik7XG5cbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHBhcmFtczogeyBbcGFyYW06IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgbGV0IHEgPSAxO1xuICBjb25zdCBbLCB0eXBlLCBzdWJ0eXBlLCBwYXJhbWV0ZXJzXSA9IG1hdGNoO1xuXG4gIGlmIChwYXJhbWV0ZXJzKSB7XG4gICAgY29uc3Qga3ZwcyA9IHNwbGl0UGFyYW1ldGVycyhwYXJhbWV0ZXJzKS5tYXAoc3BsaXRLZXlWYWx1ZVBhaXIpO1xuXG4gICAgZm9yIChjb25zdCBba2V5LCB2YWxdIG9mIGt2cHMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdmFsICYmIHZhbFswXSA9PT0gYFwiYCAmJiB2YWxbdmFsLmxlbmd0aCAtIDFdID09PSBgXCJgXG4gICAgICAgID8gdmFsLnNsaWNlKDEsIHZhbC5sZW5ndGggLSAxKVxuICAgICAgICA6IHZhbDtcblxuICAgICAgaWYgKGtleSA9PT0gXCJxXCIgJiYgdmFsdWUpIHtcbiAgICAgICAgcSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgcGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyB0eXBlLCBzdWJ0eXBlLCBwYXJhbXMsIHEsIGkgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBY2NlcHQoYWNjZXB0OiBzdHJpbmcpOiBNZWRpYVR5cGVTcGVjaWZpY2l0eVtdIHtcbiAgY29uc3QgYWNjZXB0cyA9IHNwbGl0TWVkaWFUeXBlcyhhY2NlcHQpO1xuXG4gIGNvbnN0IG1lZGlhVHlwZXM6IE1lZGlhVHlwZVNwZWNpZmljaXR5W10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY2NlcHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbWVkaWFUeXBlID0gcGFyc2VNZWRpYVR5cGUoYWNjZXB0c1tpXS50cmltKCksIGkpO1xuXG4gICAgaWYgKG1lZGlhVHlwZSkge1xuICAgICAgbWVkaWFUeXBlcy5wdXNoKG1lZGlhVHlwZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1lZGlhVHlwZXM7XG59XG5cbmZ1bmN0aW9uIGdldEZ1bGxUeXBlKHNwZWM6IE1lZGlhVHlwZVNwZWNpZmljaXR5KSB7XG4gIHJldHVybiBgJHtzcGVjLnR5cGV9LyR7c3BlYy5zdWJ0eXBlfWA7XG59XG5cbmZ1bmN0aW9uIHNwZWNpZnkoXG4gIHR5cGU6IHN0cmluZyxcbiAgc3BlYzogTWVkaWFUeXBlU3BlY2lmaWNpdHksXG4gIGluZGV4OiBudW1iZXIsXG4pOiBTcGVjaWZpY2l0eSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHAgPSBwYXJzZU1lZGlhVHlwZSh0eXBlLCBpbmRleCk7XG5cbiAgaWYgKCFwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHMgPSAwO1xuXG4gIGlmIChzcGVjLnR5cGUudG9Mb3dlckNhc2UoKSA9PT0gcC50eXBlLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBzIHw9IDQ7XG4gIH0gZWxzZSBpZiAoc3BlYy50eXBlICE9PSBcIipcIikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzcGVjLnN1YnR5cGUudG9Mb3dlckNhc2UoKSA9PT0gcC5zdWJ0eXBlLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBzIHw9IDI7XG4gIH0gZWxzZSBpZiAoc3BlYy5zdWJ0eXBlICE9PSBcIipcIikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzcGVjLnBhcmFtcyk7XG4gIGlmIChrZXlzLmxlbmd0aCkge1xuICAgIGlmIChcbiAgICAgIGtleXMuZXZlcnkoKGtleSkgPT5cbiAgICAgICAgKHNwZWMucGFyYW1zW2tleV0gfHwgXCJcIikudG9Mb3dlckNhc2UoKSA9PT1cbiAgICAgICAgICAocC5wYXJhbXNba2V5XSB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpXG4gICAgICApXG4gICAgKSB7XG4gICAgICBzIHw9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGk6IGluZGV4LFxuICAgIG86IHNwZWMubyxcbiAgICBxOiBzcGVjLnEsXG4gICAgcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0TWVkaWFUeXBlUHJpb3JpdHkoXG4gIHR5cGU6IHN0cmluZyxcbiAgYWNjZXB0ZWQ6IE1lZGlhVHlwZVNwZWNpZmljaXR5W10sXG4gIGluZGV4OiBudW1iZXIsXG4pIHtcbiAgbGV0IHByaW9yaXR5OiBTcGVjaWZpY2l0eSA9IHsgbzogLTEsIHE6IDAsIHM6IDAsIGk6IGluZGV4IH07XG5cbiAgZm9yIChjb25zdCBhY2NlcHRzIG9mIGFjY2VwdGVkKSB7XG4gICAgY29uc3Qgc3BlYyA9IHNwZWNpZnkodHlwZSwgYWNjZXB0cywgaW5kZXgpO1xuXG4gICAgaWYgKFxuICAgICAgc3BlYyAmJlxuICAgICAgKChwcmlvcml0eS5zIHx8IDApIC0gKHNwZWMucyB8fCAwKSB8fFxuICAgICAgICAgIChwcmlvcml0eS5xIHx8IDApIC0gKHNwZWMucSB8fCAwKSB8fFxuICAgICAgICAgIChwcmlvcml0eS5vIHx8IDApIC0gKHNwZWMubyB8fCAwKSkgPCAwXG4gICAgKSB7XG4gICAgICBwcmlvcml0eSA9IHNwZWM7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByaW9yaXR5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlZmVycmVkTWVkaWFUeXBlcyhcbiAgYWNjZXB0Pzogc3RyaW5nIHwgbnVsbCxcbiAgcHJvdmlkZWQ/OiBzdHJpbmdbXSxcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgYWNjZXB0cyA9IHBhcnNlQWNjZXB0KGFjY2VwdCA9PT0gdW5kZWZpbmVkID8gXCIqLypcIiA6IGFjY2VwdCB8fCBcIlwiKTtcblxuICBpZiAoIXByb3ZpZGVkKSB7XG4gICAgcmV0dXJuIGFjY2VwdHNcbiAgICAgIC5maWx0ZXIoaXNRdWFsaXR5KVxuICAgICAgLnNvcnQoY29tcGFyZVNwZWNzKVxuICAgICAgLm1hcChnZXRGdWxsVHlwZSk7XG4gIH1cblxuICBjb25zdCBwcmlvcml0aWVzID0gcHJvdmlkZWQubWFwKCh0eXBlLCBpbmRleCkgPT4ge1xuICAgIHJldHVybiBnZXRNZWRpYVR5cGVQcmlvcml0eSh0eXBlLCBhY2NlcHRzLCBpbmRleCk7XG4gIH0pO1xuXG4gIHJldHVybiBwcmlvcml0aWVzXG4gICAgLmZpbHRlcihpc1F1YWxpdHkpXG4gICAgLnNvcnQoY29tcGFyZVNwZWNzKVxuICAgIC5tYXAoKHByaW9yaXR5KSA9PiBwcm92aWRlZFtwcmlvcml0aWVzLmluZGV4T2YocHJpb3JpdHkpXSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEJDLEdBRUQsU0FBUyxZQUFZLEVBQUUsU0FBUyxRQUFxQixhQUFhLENBQUM7QUFRbkUsTUFBTSxxQkFBcUIsNkNBQTZDLEFBQUM7QUFFekUsU0FBUyxV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