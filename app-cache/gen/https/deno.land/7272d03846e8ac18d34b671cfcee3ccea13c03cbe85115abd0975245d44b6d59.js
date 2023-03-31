// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
export function swap32(val) {
    return (val & 0xff) << 24 | (val & 0xff00) << 8 | val >> 8 & 0xff00 | val >> 24 & 0xff;
}
function n16(n) {
    return n & 0xffff;
}
function n32(n) {
    return n >>> 0;
}
function add32WithCarry(a, b) {
    const added = n32(a) + n32(b);
    return [
        n32(added),
        added > 0xffffffff ? 1 : 0
    ];
}
function mul32WithCarry(a, b) {
    const al = n16(a);
    const ah = n16(a >>> 16);
    const bl = n16(b);
    const bh = n16(b >>> 16);
    const [t, tc] = add32WithCarry(al * bh, ah * bl);
    const [n, nc] = add32WithCarry(al * bl, n32(t << 16));
    const carry = nc + (tc << 16) + n16(t >>> 16) + ah * bh;
    return [
        n,
        carry
    ];
}
/**
 * mul32 performs 32-bit multiplication, a * b
 * @param a
 * @param b
 */ export function mul32(a, b) {
    // https://stackoverflow.com/a/28151933
    const al = n16(a);
    const ah = a - al;
    return n32(n32(ah * b) + al * b);
}
/**
 * mul64 performs 64-bit multiplication with two 32-bit words
 * @param [ah, al]
 * @param [bh, bl]
 */ export function mul64([ah, al], [bh, bl]) {
    const [n, c] = mul32WithCarry(al, bl);
    return [
        n32(mul32(al, bh) + mul32(ah, bl) + c),
        n
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE2MC4wL2NyeXB0by9fZm52L3V0aWwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMiB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuZXhwb3J0IGZ1bmN0aW9uIHN3YXAzMih2YWw6IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiAoXG4gICAgKCh2YWwgJiAweGZmKSA8PCAyNCkgfFxuICAgICgodmFsICYgMHhmZjAwKSA8PCA4KSB8XG4gICAgKCh2YWwgPj4gOCkgJiAweGZmMDApIHxcbiAgICAoKHZhbCA+PiAyNCkgJiAweGZmKVxuICApO1xufVxuXG5mdW5jdGlvbiBuMTYobjogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIG4gJiAweGZmZmY7XG59XG5cbmZ1bmN0aW9uIG4zMihuOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gbiA+Pj4gMDtcbn1cblxuZnVuY3Rpb24gYWRkMzJXaXRoQ2FycnkoYTogbnVtYmVyLCBiOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgYWRkZWQgPSBuMzIoYSkgKyBuMzIoYik7XG4gIHJldHVybiBbbjMyKGFkZGVkKSwgYWRkZWQgPiAweGZmZmZmZmZmID8gMSA6IDBdO1xufVxuXG5mdW5jdGlvbiBtdWwzMldpdGhDYXJyeShhOiBudW1iZXIsIGI6IG51bWJlcik6IFtudW1iZXIsIG51bWJlcl0ge1xuICBjb25zdCBhbCA9IG4xNihhKTtcbiAgY29uc3QgYWggPSBuMTYoYSA+Pj4gMTYpO1xuICBjb25zdCBibCA9IG4xNihiKTtcbiAgY29uc3QgYmggPSBuMTYoYiA+Pj4gMTYpO1xuXG4gIGNvbnN0IFt0LCB0Y10gPSBhZGQzMldpdGhDYXJyeShhbCAqIGJoLCBhaCAqIGJsKTtcbiAgY29uc3QgW24sIG5jXSA9IGFkZDMyV2l0aENhcnJ5KGFsICogYmwsIG4zMih0IDw8IDE2KSk7XG4gIGNvbnN0IGNhcnJ5ID0gbmMgKyAodGMgPDwgMTYpICsgbjE2KHQgPj4+IDE2KSArIGFoICogYmg7XG5cbiAgcmV0dXJuIFtuLCBjYXJyeV07XG59XG5cbi8qKlxuICogbXVsMzIgcGVyZm9ybXMgMzItYml0IG11bHRpcGxpY2F0aW9uLCBhICogYlxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtdWwzMihhOiBudW1iZXIsIGI6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yODE1MTkzM1xuICBjb25zdCBhbCA9IG4xNihhKTtcbiAgY29uc3QgYWggPSBhIC0gYWw7XG4gIHJldHVybiBuMzIobjMyKGFoICogYikgKyBhbCAqIGIpO1xufVxuXG4vKipcbiAqIG11bDY0IHBlcmZvcm1zIDY0LWJpdCBtdWx0aXBsaWNhdGlvbiB3aXRoIHR3byAzMi1iaXQgd29yZHNcbiAqIEBwYXJhbSBbYWgsIGFsXVxuICogQHBhcmFtIFtiaCwgYmxdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtdWw2NChcbiAgW2FoLCBhbF06IFtudW1iZXIsIG51bWJlcl0sXG4gIFtiaCwgYmxdOiBbbnVtYmVyLCBudW1iZXJdLFxuKTogW251bWJlciwgbnVtYmVyXSB7XG4gIGNvbnN0IFtuLCBjXSA9IG11bDMyV2l0aENhcnJ5KGFsLCBibCk7XG4gIHJldHVybiBbbjMyKG11bDMyKGFsLCBiaCkgKyBtdWwzMihhaCwgYmwpICsgYyksIG5dO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckMsT0FBTyxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQVU7SUFDMUMsT0FDRSxBQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FDbEIsQ0FBQyxHQUFHLEdBQUcsTUFBTSxD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