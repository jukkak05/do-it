import { deferred } from "../deps.ts";
export class DeferredStack {
    #elements;
    #creator;
    #max_size;
    #queue;
    #size;
    constructor(max, ls, creator){
        this.#elements = ls ? [
            ...ls
        ] : [];
        this.#creator = creator;
        this.#max_size = max || 10;
        this.#queue = [];
        this.#size = this.#elements.length;
    }
    get available() {
        return this.#elements.length;
    }
    async pop() {
        if (this.#elements.length > 0) {
            return this.#elements.pop();
        } else if (this.#size < this.#max_size && this.#creator) {
            this.#size++;
            return await this.#creator();
        }
        const d = deferred();
        this.#queue.push(d);
        return await d;
    }
    push(value) {
        if (this.#queue.length > 0) {
            const d = this.#queue.shift();
            d.resolve(value);
        } else {
            this.#elements.push(value);
        }
    }
    get size() {
        return this.#size;
    }
}
/**
 * The DeferredAccessStack provides access to a series of elements provided on the stack creation,
 * but with the caveat that they require an initialization of sorts before they can be used
 *
 * Instead of providing a `creator` function as you would with the `DeferredStack`, you provide
 * an initialization callback to execute for each element that is retrieved from the stack and a check
 * callback to determine if the element requires initialization and return a count of the initialized
 * elements
 */ export class DeferredAccessStack {
    #elements;
    #initializeElement;
    #checkElementInitialization;
    #queue;
    #size;
    get available() {
        return this.#elements.length;
    }
    /**
   * The max number of elements that can be contained in the stack a time
   */ get size() {
        return this.#size;
    }
    /**
   * @param initialize This function will execute for each element that hasn't been initialized when requested from the stack
   */ constructor(elements, initCallback, checkInitCallback){
        this.#checkElementInitialization = checkInitCallback;
        this.#elements = elements;
        this.#initializeElement = initCallback;
        this.#queue = [];
        this.#size = elements.length;
    }
    /**
   * Will execute the check for initialization on each element of the stack
   * and then return the number of initialized elements that pass the check
   */ async initialized() {
        const initialized = await Promise.all(this.#elements.map((e)=>this.#checkElementInitialization(e)));
        return initialized.filter((initialized)=>initialized === true).length;
    }
    async pop() {
        let element;
        if (this.available > 0) {
            element = this.#elements.pop();
        } else {
            // If there are not elements left in the stack, it will await the call until
            // at least one is restored and then return it
            const d = deferred();
            this.#queue.push(d);
            element = await d;
        }
        if (!await this.#checkElementInitialization(element)) {
            await this.#initializeElement(element);
        }
        return element;
    }
    push(value) {
        // If an element has been requested while the stack was empty, indicate
        // that an element has been restored
        if (this.#queue.length > 0) {
            const d = this.#queue.shift();
            d.resolve(value);
        } else {
            this.#elements.push(value);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcG9zdGdyZXNAdjAuMTcuMC91dGlscy9kZWZlcnJlZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0eXBlIERlZmVycmVkLCBkZWZlcnJlZCB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZWZlcnJlZFN0YWNrPFQ+IHtcbiAgI2VsZW1lbnRzOiBBcnJheTxUPjtcbiAgI2NyZWF0b3I/OiAoKSA9PiBQcm9taXNlPFQ+O1xuICAjbWF4X3NpemU6IG51bWJlcjtcbiAgI3F1ZXVlOiBBcnJheTxEZWZlcnJlZDxUPj47XG4gICNzaXplOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgbWF4PzogbnVtYmVyLFxuICAgIGxzPzogSXRlcmFibGU8VD4sXG4gICAgY3JlYXRvcj86ICgpID0+IFByb21pc2U8VD4sXG4gICkge1xuICAgIHRoaXMuI2VsZW1lbnRzID0gbHMgPyBbLi4ubHNdIDogW107XG4gICAgdGhpcy4jY3JlYXRvciA9IGNyZWF0b3I7XG4gICAgdGhpcy4jbWF4X3NpemUgPSBtYXggfHwgMTA7XG4gICAgdGhpcy4jcXVldWUgPSBbXTtcbiAgICB0aGlzLiNzaXplID0gdGhpcy4jZWxlbWVudHMubGVuZ3RoO1xuICB9XG5cbiAgZ2V0IGF2YWlsYWJsZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNlbGVtZW50cy5sZW5ndGg7XG4gIH1cblxuICBhc3luYyBwb3AoKTogUHJvbWlzZTxUPiB7XG4gICAgaWYgKHRoaXMuI2VsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0aGlzLiNlbGVtZW50cy5wb3AoKSE7XG4gICAgfSBlbHNlIGlmICh0aGlzLiNzaXplIDwgdGhpcy4jbWF4X3NpemUgJiYgdGhpcy4jY3JlYXRvcikge1xuICAgICAgdGhpcy4jc2l6ZSsrO1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuI2NyZWF0b3IoKTtcbiAgICB9XG4gICAgY29uc3QgZCA9IGRlZmVycmVkPFQ+KCk7XG4gICAgdGhpcy4jcXVldWUucHVzaChkKTtcbiAgICByZXR1cm4gYXdhaXQgZDtcbiAgfVxuXG4gIHB1c2godmFsdWU6IFQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy4jcXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZCA9IHRoaXMuI3F1ZXVlLnNoaWZ0KCkhO1xuICAgICAgZC5yZXNvbHZlKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4jZWxlbWVudHMucHVzaCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jc2l6ZTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBEZWZlcnJlZEFjY2Vzc1N0YWNrIHByb3ZpZGVzIGFjY2VzcyB0byBhIHNlcmllcyBvZiBlbGVtZW50cyBwcm92aWRlZCBvbiB0aGUgc3RhY2sgY3JlYXRpb24sXG4gKiBidXQgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdGhleSByZXF1aXJlIGFuIGluaXRpYWxpemF0aW9uIG9mIHNvcnRzIGJlZm9yZSB0aGV5IGNhbiBiZSB1c2VkXG4gKlxuICogSW5zdGVhZCBvZiBwcm92aWRpbmcgYSBgY3JlYXRvcmAgZnVuY3Rpb24gYXMgeW91IHdvdWxkIHdpdGggdGhlIGBEZWZlcnJlZFN0YWNrYCwgeW91IHByb3ZpZGVcbiAqIGFuIGluaXRpYWxpemF0aW9uIGNhbGxiYWNrIHRvIGV4ZWN1dGUgZm9yIGVhY2ggZWxlbWVudCB0aGF0IGlzIHJldHJpZXZlZCBmcm9tIHRoZSBzdGFjayBhbmQgYSBjaGVja1xuICogY2FsbGJhY2sgdG8gZGV0ZXJtaW5lIGlmIHRoZSBlbGVtZW50IHJlcXVpcmVzIGluaXRpYWxpemF0aW9uIGFuZCByZXR1cm4gYSBjb3VudCBvZiB0aGUgaW5pdGlhbGl6ZWRcbiAqIGVsZW1lbnRzXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZlcnJlZEFjY2Vzc1N0YWNrPFQ+IHtcbiAgI2VsZW1lbnRzOiBBcnJheTxUPjtcbiAgI2luaXRpYWxpemVFbGVtZW50OiAoZWxlbWVudDogVCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgI2NoZWNrRWxlbWVudEluaXRpYWxpemF0aW9uOiAoZWxlbWVudDogVCkgPT4gUHJvbWlzZTxib29sZWFuPiB8IGJvb2xlYW47XG4gICNxdWV1ZTogQXJyYXk8RGVmZXJyZWQ8VD4+O1xuICAjc2l6ZTogbnVtYmVyO1xuXG4gIGdldCBhdmFpbGFibGUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jZWxlbWVudHMubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBtYXggbnVtYmVyIG9mIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNvbnRhaW5lZCBpbiB0aGUgc3RhY2sgYSB0aW1lXG4gICAqL1xuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNzaXplO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBpbml0aWFsaXplIFRoaXMgZnVuY3Rpb24gd2lsbCBleGVjdXRlIGZvciBlYWNoIGVsZW1lbnQgdGhhdCBoYXNuJ3QgYmVlbiBpbml0aWFsaXplZCB3aGVuIHJlcXVlc3RlZCBmcm9tIHRoZSBzdGFja1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudHM6IFRbXSxcbiAgICBpbml0Q2FsbGJhY2s6IChlbGVtZW50OiBUKSA9PiBQcm9taXNlPHZvaWQ+LFxuICAgIGNoZWNrSW5pdENhbGxiYWNrOiAoZWxlbWVudDogVCkgPT4gUHJvbWlzZTxib29sZWFuPiB8IGJvb2xlYW4sXG4gICkge1xuICAgIHRoaXMuI2NoZWNrRWxlbWVudEluaXRpYWxpemF0aW9uID0gY2hlY2tJbml0Q2FsbGJhY2s7XG4gICAgdGhpcy4jZWxlbWVudHMgPSBlbGVtZW50cztcbiAgICB0aGlzLiNpbml0aWFsaXplRWxlbWVudCA9IGluaXRDYWxsYmFjaztcbiAgICB0aGlzLiNxdWV1ZSA9IFtdO1xuICAgIHRoaXMuI3NpemUgPSBlbGVtZW50cy5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogV2lsbCBleGVjdXRlIHRoZSBjaGVjayBmb3IgaW5pdGlhbGl6YXRpb24gb24gZWFjaCBlbGVtZW50IG9mIHRoZSBzdGFja1xuICAgKiBhbmQgdGhlbiByZXR1cm4gdGhlIG51bWJlciBvZiBpbml0aWFsaXplZCBlbGVtZW50cyB0aGF0IHBhc3MgdGhlIGNoZWNrXG4gICAqL1xuICBhc3luYyBpbml0aWFsaXplZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGluaXRpYWxpemVkID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICB0aGlzLiNlbGVtZW50cy5tYXAoKGUpID0+IHRoaXMuI2NoZWNrRWxlbWVudEluaXRpYWxpemF0aW9uKGUpKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIGluaXRpYWxpemVkXG4gICAgICAuZmlsdGVyKChpbml0aWFsaXplZCkgPT4gaW5pdGlhbGl6ZWQgPT09IHRydWUpXG4gICAgICAubGVuZ3RoO1xuICB9XG5cbiAgYXN5bmMgcG9wKCk6IFByb21pc2U8VD4ge1xuICAgIGxldCBlbGVtZW50OiBUO1xuICAgIGlmICh0aGlzLmF2YWlsYWJsZSA+IDApIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLiNlbGVtZW50cy5wb3AoKSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBub3QgZWxlbWVudHMgbGVmdCBpbiB0aGUgc3RhY2ssIGl0IHdpbGwgYXdhaXQgdGhlIGNhbGwgdW50aWxcbiAgICAgIC8vIGF0IGxlYXN0IG9uZSBpcyByZXN0b3JlZCBhbmQgdGhlbiByZXR1cm4gaXRcbiAgICAgIGNvbnN0IGQgPSBkZWZlcnJlZDxUPigpO1xuICAgICAgdGhpcy4jcXVldWUucHVzaChkKTtcbiAgICAgIGVsZW1lbnQgPSBhd2FpdCBkO1xuICAgIH1cblxuICAgIGlmICghYXdhaXQgdGhpcy4jY2hlY2tFbGVtZW50SW5pdGlhbGl6YXRpb24oZWxlbWVudCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuI2luaXRpYWxpemVFbGVtZW50KGVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIHB1c2godmFsdWU6IFQpOiB2b2lkIHtcbiAgICAvLyBJZiBhbiBlbGVtZW50IGhhcyBiZWVuIHJlcXVlc3RlZCB3aGlsZSB0aGUgc3RhY2sgd2FzIGVtcHR5LCBpbmRpY2F0ZVxuICAgIC8vIHRoYXQgYW4gZWxlbWVudCBoYXMgYmVlbiByZXN0b3JlZFxuICAgIGlmICh0aGlzLiNxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBkID0gdGhpcy4jcXVldWUuc2hpZnQoKSE7XG4gICAgICBkLnJlc29sdmUodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiNlbGVtZW50cy5wdXNoKHZhbHVlKTtcbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUF3QixRQUFRLFFBQVEsWUFBWSxDQUFDO0FBRXJELE9BQU8sTUFBTSxhQUFhO0lBQ3hCLENBQUMsUUFBUSxDQUFXO0lBQ3BCLENBQUMsT0FBTyxDQUFvQjtJQUM1QixDQUFDLFFBQVEsQ0FBUztJQUNsQixDQUFDLEtBQUssQ0FBcUI7SUFDM0IsQ0FBQyxJQUFJLENBQVM7SUFFZCxZQUNFLEdBQVksRUFDWixFQUFnQixFQUNoQixPQUEwQixDQUMxQjtRQUNBLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFFLEdBQUc7ZUFBSSxFQUFFO1NBQUMsR0FBRyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQ3JDO1FBRUksU0FBUyxHQUFXO1FBQ3RCLE9BQU8s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