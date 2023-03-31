import { Column } from "../query/decode.ts";
import { PacketReader } from "./packet.ts";
import { RowDescription } from "../query/query.ts";
export class Message {
    reader;
    constructor(type, byteCount, body){
        this.type = type;
        this.byteCount = byteCount;
        this.body = body;
        this.reader = new PacketReader(body);
    }
    type;
    byteCount;
    body;
}
export function parseBackendKeyMessage(message) {
    return {
        pid: message.reader.readInt32(),
        secret_key: message.reader.readInt32()
    };
}
/**
 * This function returns the command result tag from the command message
 */ export function parseCommandCompleteMessage(message) {
    return message.reader.readString(message.byteCount);
}
/**
 * https://www.postgresql.org/docs/14/protocol-error-fields.html
 */ export function parseNoticeMessage(message) {
    // deno-lint-ignore no-explicit-any
    const error_fields = {};
    let byte;
    let field_code;
    let field_value;
    while(byte = message.reader.readByte()){
        field_code = String.fromCharCode(byte);
        field_value = message.reader.readCString();
        switch(field_code){
            case "S":
                error_fields.severity = field_value;
                break;
            case "C":
                error_fields.code = field_value;
                break;
            case "M":
                error_fields.message = field_value;
                break;
            case "D":
                error_fields.detail = field_value;
                break;
            case "H":
                error_fields.hint = field_value;
                break;
            case "P":
                error_fields.position = field_value;
                break;
            case "p":
                error_fields.internalPosition = field_value;
                break;
            case "q":
                error_fields.internalQuery = field_value;
                break;
            case "W":
                error_fields.where = field_value;
                break;
            case "s":
                error_fields.schema = field_value;
                break;
            case "t":
                error_fields.table = field_value;
                break;
            case "c":
                error_fields.column = field_value;
                break;
            case "d":
                error_fields.dataTypeName = field_value;
                break;
            case "n":
                error_fields.constraint = field_value;
                break;
            case "F":
                error_fields.file = field_value;
                break;
            case "L":
                error_fields.line = field_value;
                break;
            case "R":
                error_fields.routine = field_value;
                break;
            default:
                break;
        }
    }
    return error_fields;
}
/**
 * Parses a row data message into an array of bytes ready to be processed as column values
 */ // TODO
// Research corner cases where parseRowData can return null values
// deno-lint-ignore no-explicit-any
export function parseRowDataMessage(message) {
    const field_count = message.reader.readInt16();
    const row = [];
    for(let i = 0; i < field_count; i++){
        const col_length = message.reader.readInt32();
        if (col_length == -1) {
            row.push(null);
            continue;
        }
        // reading raw bytes here, they will be properly parsed later
        row.push(message.reader.readBytes(col_length));
    }
    return row;
}
export function parseRowDescriptionMessage(message) {
    const column_count = message.reader.readInt16();
    const columns = [];
    for(let i = 0; i < column_count; i++){
        // TODO: if one of columns has 'format' == 'binary',
        // all of them will be in same format?
        const column = new Column(message.reader.readCString(), message.reader.readInt32(), message.reader.readInt16(), message.reader.readInt32(), message.reader.readInt16(), message.reader.readInt32(), message.reader.readInt16());
        columns.push(column);
    }
    return new RowDescription(column_count, columns);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcG9zdGdyZXNAdjAuMTcuMC9jb25uZWN0aW9uL21lc3NhZ2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29sdW1uIH0gZnJvbSBcIi4uL3F1ZXJ5L2RlY29kZS50c1wiO1xuaW1wb3J0IHsgUGFja2V0UmVhZGVyIH0gZnJvbSBcIi4vcGFja2V0LnRzXCI7XG5pbXBvcnQgeyBSb3dEZXNjcmlwdGlvbiB9IGZyb20gXCIuLi9xdWVyeS9xdWVyeS50c1wiO1xuXG5leHBvcnQgY2xhc3MgTWVzc2FnZSB7XG4gIHB1YmxpYyByZWFkZXI6IFBhY2tldFJlYWRlcjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgdHlwZTogc3RyaW5nLFxuICAgIHB1YmxpYyBieXRlQ291bnQ6IG51bWJlcixcbiAgICBwdWJsaWMgYm9keTogVWludDhBcnJheSxcbiAgKSB7XG4gICAgdGhpcy5yZWFkZXIgPSBuZXcgUGFja2V0UmVhZGVyKGJvZHkpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlIHtcbiAgc2V2ZXJpdHk6IHN0cmluZztcbiAgY29kZTogc3RyaW5nO1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIGRldGFpbD86IHN0cmluZztcbiAgaGludD86IHN0cmluZztcbiAgcG9zaXRpb24/OiBzdHJpbmc7XG4gIGludGVybmFsUG9zaXRpb24/OiBzdHJpbmc7XG4gIGludGVybmFsUXVlcnk/OiBzdHJpbmc7XG4gIHdoZXJlPzogc3RyaW5nO1xuICBzY2hlbWE/OiBzdHJpbmc7XG4gIHRhYmxlPzogc3RyaW5nO1xuICBjb2x1bW4/OiBzdHJpbmc7XG4gIGRhdGFUeXBlPzogc3RyaW5nO1xuICBjb25zdHJhaW50Pzogc3RyaW5nO1xuICBmaWxlPzogc3RyaW5nO1xuICBsaW5lPzogc3RyaW5nO1xuICByb3V0aW5lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VCYWNrZW5kS2V5TWVzc2FnZShcbiAgbWVzc2FnZTogTWVzc2FnZSxcbik6IHsgcGlkOiBudW1iZXI7IHNlY3JldF9rZXk6IG51bWJlciB9IHtcbiAgcmV0dXJuIHtcbiAgICBwaWQ6IG1lc3NhZ2UucmVhZGVyLnJlYWRJbnQzMigpLFxuICAgIHNlY3JldF9rZXk6IG1lc3NhZ2UucmVhZGVyLnJlYWRJbnQzMigpLFxuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgY29tbWFuZCByZXN1bHQgdGFnIGZyb20gdGhlIGNvbW1hbmQgbWVzc2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb21tYW5kQ29tcGxldGVNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpOiBzdHJpbmcge1xuICByZXR1cm4gbWVzc2FnZS5yZWFkZXIucmVhZFN0cmluZyhtZXNzYWdlLmJ5dGVDb3VudCk7XG59XG5cbi8qKlxuICogaHR0cHM6Ly93d3cucG9zdGdyZXNxbC5vcmcvZG9jcy8xNC9wcm90b2NvbC1lcnJvci1maWVsZHMuaHRtbFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOb3RpY2VNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpOiBOb3RpY2Uge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBjb25zdCBlcnJvcl9maWVsZHM6IGFueSA9IHt9O1xuXG4gIGxldCBieXRlOiBudW1iZXI7XG4gIGxldCBmaWVsZF9jb2RlOiBzdHJpbmc7XG4gIGxldCBmaWVsZF92YWx1ZTogc3RyaW5nO1xuXG4gIHdoaWxlICgoYnl0ZSA9IG1lc3NhZ2UucmVhZGVyLnJlYWRCeXRlKCkpKSB7XG4gICAgZmllbGRfY29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSk7XG4gICAgZmllbGRfdmFsdWUgPSBtZXNzYWdlLnJlYWRlci5yZWFkQ1N0cmluZygpO1xuXG4gICAgc3dpdGNoIChmaWVsZF9jb2RlKSB7XG4gICAgICBjYXNlIFwiU1wiOlxuICAgICAgICBlcnJvcl9maWVsZHMuc2V2ZXJpdHkgPSBmaWVsZF92YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiQ1wiOlxuICAgICAgICBlcnJvcl9maWVsZHMuY29kZSA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJNXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy5tZXNzYWdlID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIkRcIjpcbiAgICAgICAgZXJyb3JfZmllbGRzLmRldGFpbCA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJIXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy5oaW50ID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIlBcIjpcbiAgICAgICAgZXJyb3JfZmllbGRzLnBvc2l0aW9uID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInBcIjpcbiAgICAgICAgZXJyb3JfZmllbGRzLmludGVybmFsUG9zaXRpb24gPSBmaWVsZF92YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwicVwiOlxuICAgICAgICBlcnJvcl9maWVsZHMuaW50ZXJuYWxRdWVyeSA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJXXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy53aGVyZSA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJzXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy5zY2hlbWEgPSBmaWVsZF92YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwidFwiOlxuICAgICAgICBlcnJvcl9maWVsZHMudGFibGUgPSBmaWVsZF92YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiY1wiOlxuICAgICAgICBlcnJvcl9maWVsZHMuY29sdW1uID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgZXJyb3JfZmllbGRzLmRhdGFUeXBlTmFtZSA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJuXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy5jb25zdHJhaW50ID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIkZcIjpcbiAgICAgICAgZXJyb3JfZmllbGRzLmZpbGUgPSBmaWVsZF92YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiTFwiOlxuICAgICAgICBlcnJvcl9maWVsZHMubGluZSA9IGZpZWxkX3ZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJSXCI6XG4gICAgICAgIGVycm9yX2ZpZWxkcy5yb3V0aW5lID0gZmllbGRfdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gZnJvbSBQb3N0Z3JlcyBkb2NzXG4gICAgICAgIC8vID4gU2luY2UgbW9yZSBmaWVsZCB0eXBlcyBtaWdodCBiZSBhZGRlZCBpbiBmdXR1cmUsXG4gICAgICAgIC8vID4gZnJvbnRlbmRzIHNob3VsZCBzaWxlbnRseSBpZ25vcmUgZmllbGRzIG9mIHVucmVjb2duaXplZCB0eXBlLlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZXJyb3JfZmllbGRzO1xufVxuXG4vKipcbiAqIFBhcnNlcyBhIHJvdyBkYXRhIG1lc3NhZ2UgaW50byBhbiBhcnJheSBvZiBieXRlcyByZWFkeSB0byBiZSBwcm9jZXNzZWQgYXMgY29sdW1uIHZhbHVlc1xuICovXG4vLyBUT0RPXG4vLyBSZXNlYXJjaCBjb3JuZXIgY2FzZXMgd2hlcmUgcGFyc2VSb3dEYXRhIGNhbiByZXR1cm4gbnVsbCB2YWx1ZXNcbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gcGFyc2VSb3dEYXRhTWVzc2FnZShtZXNzYWdlOiBNZXNzYWdlKTogYW55W10ge1xuICBjb25zdCBmaWVsZF9jb3VudCA9IG1lc3NhZ2UucmVhZGVyLnJlYWRJbnQxNigpO1xuICBjb25zdCByb3cgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGZpZWxkX2NvdW50OyBpKyspIHtcbiAgICBjb25zdCBjb2xfbGVuZ3RoID0gbWVzc2FnZS5yZWFkZXIucmVhZEludDMyKCk7XG5cbiAgICBpZiAoY29sX2xlbmd0aCA9PSAtMSkge1xuICAgICAgcm93LnB1c2gobnVsbCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyByZWFkaW5nIHJhdyBieXRlcyBoZXJlLCB0aGV5IHdpbGwgYmUgcHJvcGVybHkgcGFyc2VkIGxhdGVyXG4gICAgcm93LnB1c2gobWVzc2FnZS5yZWFkZXIucmVhZEJ5dGVzKGNvbF9sZW5ndGgpKTtcbiAgfVxuXG4gIHJldHVybiByb3c7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVJvd0Rlc2NyaXB0aW9uTWVzc2FnZShtZXNzYWdlOiBNZXNzYWdlKTogUm93RGVzY3JpcHRpb24ge1xuICBjb25zdCBjb2x1bW5fY291bnQgPSBtZXNzYWdlLnJlYWRlci5yZWFkSW50MTYoKTtcbiAgY29uc3QgY29sdW1ucyA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29sdW1uX2NvdW50OyBpKyspIHtcbiAgICAvLyBUT0RPOiBpZiBvbmUgb2YgY29sdW1ucyBoYXMgJ2Zvcm1hdCcgPT0gJ2JpbmFyeScsXG4gICAgLy8gYWxsIG9mIHRoZW0gd2lsbCBiZSBpbiBzYW1lIGZvcm1hdD9cbiAgICBjb25zdCBjb2x1bW4gPSBuZXcgQ29sdW1uKFxuICAgICAgbWVzc2FnZS5yZWFkZXIucmVhZENTdHJpbmcoKSwgLy8gbmFtZVxuICAgICAgbWVzc2FnZS5yZWFkZXIucmVhZEludDMyKCksIC8vIHRhYmxlT2lkXG4gICAgICBtZXNzYWdlLnJlYWRlci5yZWFkSW50MTYoKSwgLy8gaW5kZXhcbiAgICAgIG1lc3NhZ2UucmVhZGVyLnJlYWRJbnQzMigpLCAvLyBkYXRhVHlwZU9pZFxuICAgICAgbWVzc2FnZS5yZWFkZXIucmVhZEludDE2KCksIC8vIGNvbHVtblxuICAgICAgbWVzc2FnZS5yZWFkZXIucmVhZEludDMyKCksIC8vIHR5cGVNb2RpZmllclxuICAgICAgbWVzc2FnZS5yZWFkZXIucmVhZEludDE2KCksIC8vIGZvcm1hdFxuICAgICk7XG4gICAgY29sdW1ucy5wdXNoKGNvbHVtbik7XG4gIH1cblxuICByZXR1cm4gbmV3IFJvd0Rlc2NyaXB0aW9uKGNvbHVtbl9jb3VudCwgY29sdW1ucyk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxNQUFNLFFBQVEsb0JBQW9CLENBQUM7QUFDNUMsU0FBUyxZQUFZLFFBQVEsYUFBYSxDQUFDO0FBQzNDLFNBQVMsY0FBYyxRQUFRLG1CQUFtQixDQUFDO0FBRW5ELE9BQU8sTUFBTSxPQUFPO0lBQ2xCLEFBQU8sTUFBTSxDQUFlO0lBRTVCLFlBQ1MsSUFBWSxFQUNaLFNBQWlCLEVBQ2pCLElBQWdCLENBQ3ZCO1FBSE8sWUFBQSxJQUFZLENBQUE7UUFDWixpQkFBQSxTQUFpQixDQUFBO1FBQ2pCLFlBQUEsSUFBZ0IsQ0FBQTtRQUV2QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDO0lBTFMsSUFBWTtJQUNaLFNBQWlCO0lBQ2pCLElBQWdCO0NBSTFCO0FBc0JELE9BQU8sU0FBUyxzQkFBc0IsQ0FDcEMsT0FBZ0IsRUFDcUI7SUFDckMsT0FBTztRQUNMLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtRQUMvQixVQUFVLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUU7S0FDdkMsQ0FBQztBQUNKLENBQUM7QUFFRDs7Q0FFQyxHQUNELE9BQU8sU0FBUywyQkFBMkIsQ0FBQyxPQUFnQixFQUFVO0lBQ3BFLE9BQU8s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