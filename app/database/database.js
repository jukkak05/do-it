// Connect to PostgreSQL Database
// https://deno.land/x/postgres@v0.17.0/docs/README.md
import { Client } from "../deps.js";

// Look for env variable 
if ( Deno.env.get("DATABASE_URL") ) {
    var client = new Client( Deno.env.get("DATABASE_URL") );
} else {
    var client = new Client();
}

const executeQuery = async (query, args) => {
    
    const response = {}; 

    await client.connect();

    try {

        var result = await client.queryObject(query, args);

        if (result) {
            response.rows = result.rows; 
        }

    } catch (err) {

        response.error = err; 

    } finally {

        try {

            await client.end(); 
           
        } catch (err) {

            console.log("Unable to release database connection."); 
            console.log(err); 

        }

    }

    return response; 

}

export { executeQuery }; 