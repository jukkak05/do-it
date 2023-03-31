// https://www.postgresql.org/docs/14/protocol-message-formats.html
export const ERROR_MESSAGE = "E";
export const AUTHENTICATION_TYPE = {
    CLEAR_TEXT: 3,
    GSS_CONTINUE: 8,
    GSS_STARTUP: 7,
    MD5: 5,
    NO_AUTHENTICATION: 0,
    SASL_CONTINUE: 11,
    SASL_FINAL: 12,
    SASL_STARTUP: 10,
    SCM: 6,
    SSPI: 9
};
export const INCOMING_QUERY_BIND_MESSAGES = {};
export const INCOMING_QUERY_PARSE_MESSAGES = {};
export const INCOMING_AUTHENTICATION_MESSAGES = {
    AUTHENTICATION: "R",
    BACKEND_KEY: "K",
    PARAMETER_STATUS: "S",
    READY: "Z"
};
export const INCOMING_TLS_MESSAGES = {
    ACCEPTS_TLS: "S",
    NO_ACCEPTS_TLS: "N"
};
export const INCOMING_QUERY_MESSAGES = {
    BIND_COMPLETE: "2",
    PARSE_COMPLETE: "1",
    COMMAND_COMPLETE: "C",
    DATA_ROW: "D",
    EMPTY_QUERY: "I",
    NO_DATA: "n",
    NOTICE_WARNING: "N",
    PARAMETER_STATUS: "S",
    READY: "Z",
    ROW_DESCRIPTION: "T"
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcG9zdGdyZXNAdjAuMTcuMC9jb25uZWN0aW9uL21lc3NhZ2VfY29kZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBodHRwczovL3d3dy5wb3N0Z3Jlc3FsLm9yZy9kb2NzLzE0L3Byb3RvY29sLW1lc3NhZ2UtZm9ybWF0cy5odG1sXG5cbmV4cG9ydCBjb25zdCBFUlJPUl9NRVNTQUdFID0gXCJFXCI7XG5cbmV4cG9ydCBjb25zdCBBVVRIRU5USUNBVElPTl9UWVBFID0ge1xuICBDTEVBUl9URVhUOiAzLFxuICBHU1NfQ09OVElOVUU6IDgsXG4gIEdTU19TVEFSVFVQOiA3LFxuICBNRDU6IDUsXG4gIE5PX0FVVEhFTlRJQ0FUSU9OOiAwLFxuICBTQVNMX0NPTlRJTlVFOiAxMSxcbiAgU0FTTF9GSU5BTDogMTIsXG4gIFNBU0xfU1RBUlRVUDogMTAsXG4gIFNDTTogNixcbiAgU1NQSTogOSxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBJTkNPTUlOR19RVUVSWV9CSU5EX01FU1NBR0VTID0ge30gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBJTkNPTUlOR19RVUVSWV9QQVJTRV9NRVNTQUdFUyA9IHt9IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgSU5DT01JTkdfQVVUSEVOVElDQVRJT05fTUVTU0FHRVMgPSB7XG4gIEFVVEhFTlRJQ0FUSU9OOiBcIlJcIixcbiAgQkFDS0VORF9LRVk6IFwiS1wiLFxuICBQQVJBTUVURVJfU1RBVFVTOiBcIlNcIixcbiAgUkVBRFk6IFwiWlwiLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IGNvbnN0IElOQ09NSU5HX1RMU19NRVNTQUdFUyA9IHtcbiAgQUNDRVBUU19UTFM6IFwiU1wiLFxuICBOT19BQ0NFUFRTX1RMUzogXCJOXCIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgSU5DT01JTkdfUVVFUllfTUVTU0FHRVMgPSB7XG4gIEJJTkRfQ09NUExFVEU6IFwiMlwiLFxuICBQQVJTRV9DT01QTEVURTogXCIxXCIsXG4gIENPTU1BTkRfQ09NUExFVEU6IFwiQ1wiLFxuICBEQVRBX1JPVzogXCJEXCIsXG4gIEVNUFRZX1FVRVJZOiBcIklcIixcbiAgTk9fREFUQTogXCJuXCIsXG4gIE5PVElDRV9XQVJOSU5HOiBcIk5cIixcbiAgUEFSQU1FVEVSX1NUQVRVUzogXCJTXCIsXG4gIFJFQURZOiBcIlpcIixcbiAgUk9XX0RFU0NSSVBUSU9OOiBcIlRcIixcbn0gYXMgY29uc3Q7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsbUVBQW1FO0FBRW5FLE9BQU8sTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDO0FBRWpDLE9BQU8sTUFBTSxtQkFBbUIsR0FBRztJQUNqQyxVQUFVLEVBQUUsQ0FBQztJQUNiLFlBQVksRUFBRSxDQUFDO0lBQ2YsV0FBVyxFQUFFLENBQUM7SUFDZCxHQUFHLEVBQUUsQ0FBQztJQUNOLGlCQUFpQixFQUFFLENBQUM7SUFDcEIsYUFBYSxFQUFFLEVBQUU7SUFDakIsVUFBVSxFQUFFLEVBQUU7SUFDZCxZQUFZLEVBQUUsRUFBRTtJQUNoQixHQUFHLEVBQUUsQ0FBQztJQUNOLElBQUksRUFBRSxDQUFDO0NBQ1IsQUFBUyxDQUFDO0FBRVgsT0FBTyxNQUFNLDRCQUE0QixHQUFHLEVBQUUsQUFBUyxDQUFDO0FBRXhELE9BQU8sTUFBTSw2QkFBNkIsR0FBRyxFQUFFLEFBQVMsQ0FBQztBQUV6RCxPQUFPLE1BQU0sZ0NBQWdDLEdBQUc7SUFDOUMsY0FBYyxFQUFFLEdBQUc7SUFDbkIsV0FBVyxFQUFFLEdBQUc7SUFDaEIsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixLQUFLLEVBQUUsR0FBRztDQUNYLEFBQVMsQ0FBQztBQUVYLE9BQU8sTUFBTSxxQkFBcUIsR0FBRztJQUNuQyxXQUFXLEVBQUUsR0FBRztJQUNoQixjQUFjLEVBQUUsR0FBRztDQUNwQixBQUFTLENBQUM7QUFFWCxPQUFPLE1BQU0sdUJBQXVCLEdBQUc7SUFDckMsYUFBYSxFQUFFLEdBQUc7SUFDbEIsY0FBYyxFQUFFLEdBQUc7SUFDbkIsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixRQUFRLEVBQUUsR0FBRztJQUNiLFdBQVcsRUFBRSxHQUFHO0lBQ2hCLE9BQU8sRUFBRSxHQUFHO0lBQ1osY0FBYyxFQUFFLEdBQUc7SUFDbkIsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixLQUFLLEVBQUUsR0FBRztJQUNWLGVBQWUsRUFBRSxHQUFHO0NBQ3JCLEFBQVMsQ0FBQyJ9