// Ported from Go:
// https://github.com/golang/go/tree/go1.13.10/src/hash/fnv/fnv.go
// Copyright 2011 The Go Authors. All rights reserved. BSD license.
// https://github.com/golang/go/blob/master/LICENSE
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { mul32, swap32 } from "./util.ts";
const prime32 = 16777619;
export const fnv32 = (data)=>{
    let hash = 2166136261;
    data.forEach((c)=>{
        hash = mul32(hash, prime32);
        hash ^= c;
    });
    return Uint32Array.from([
        swap32(hash)
    ]).buffer;
};
export const fnv32a = (data)=>{
    let hash = 2166136261;
    data.forEach((c)=>{
        hash ^= c;
        hash = mul32(hash, prime32);
    });
    return Uint32Array.from([
        swap32(hash)
    ]).buffer;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE2MC4wL2NyeXB0by9fZm52L2ZudjMyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBmcm9tIEdvOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2dvbGFuZy9nby90cmVlL2dvMS4xMy4xMC9zcmMvaGFzaC9mbnYvZm52LmdvXG4vLyBDb3B5cmlnaHQgMjAxMSBUaGUgR28gQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gQlNEIGxpY2Vuc2UuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZ29sYW5nL2dvL2Jsb2IvbWFzdGVyL0xJQ0VOU0Vcbi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IG11bDMyLCBzd2FwMzIgfSBmcm9tIFwiLi91dGlsLnRzXCI7XG5cbmNvbnN0IHByaW1lMzIgPSAxNjc3NzYxOTtcblxuZXhwb3J0IGNvbnN0IGZudjMyID0gKGRhdGE6IFVpbnQ4QXJyYXkpOiBBcnJheUJ1ZmZlciA9PiB7XG4gIGxldCBoYXNoID0gMjE2NjEzNjI2MTtcblxuICBkYXRhLmZvckVhY2goKGMpID0+IHtcbiAgICBoYXNoID0gbXVsMzIoaGFzaCwgcHJpbWUzMik7XG4gICAgaGFzaCBePSBjO1xuICB9KTtcblxuICByZXR1cm4gVWludDMyQXJyYXkuZnJvbShbc3dhcDMyKGhhc2gpXSkuYnVmZmVyO1xufTtcblxuZXhwb3J0IGNvbnN0IGZudjMyYSA9IChkYXRhOiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXIgPT4ge1xuICBsZXQgaGFzaCA9IDIxNjYxMzYyNjE7XG5cbiAgZGF0YS5mb3JFYWNoKChjKSA9PiB7XG4gICAgaGFzaCBePSBjO1xuICAgIGhhc2ggPSBtdWwzMihoYXNoLCBwcmltZTMyKTtcbiAgfSk7XG5cbiAgcmV0dXJuIFVpbnQzMkFycmF5LmZyb20oW3N3YXAzMihoYXNoKV0pLmJ1ZmZlcjtcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0JBQWtCO0FBQ2xCLGtFQUFrRTtBQUNsRSxtRUFBbUU7QUFDbkUsbURBQW1EO0FBQ25ELDBFQUEwRTtBQUMxRSxxQ0FBcUM7QUFFckMsU0FBUyxLQUFLLEVBQUUsTUFBTSxRQUFRLFdBQVcsQ0FBQztBQUUxQyxNQUFNLE9BQU8sR0FBRyxRQUFRLEFBQUM7QUFFekIsT0FBTyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQWdCLEdBQWtCO0lBQ3RELElBQUksSUFBSSxHQUFHLFVBQVUsQUFBQztJQUV0QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFLO1FBQ2xCLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLElBQUksSUFBSSxDQUFDLENBQUM7SUFDWixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQztRQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7S0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2pELENBQUMsQ0FBQztBQUVGLE9BQU8sTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFnQixHQUFrQjtJQUN2RCxJQUFJLElBQUksR0FBRyxVQUFVLEFBQUM7SUFFdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBSztRQUNsQixJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ1YsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0tBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNqRCxDQUFDLENBQUMifQ==