import { serve } from "./deps.js";
import { configure } from "./deps.js";
import { serveFile } from "./deps.js";
import * as loginController from "./controllers/loginController.js";
import * as taskController from "./controllers/taskController.js";
import * as taskEntryController from "./controllers/taskEntryController.js";

configure({
  views: `${Deno.cwd()}/views/`,
});

const handleRequest = async (request) => {

  const url = new URL(request.url);
 
  // Serve static files
  if ( url.pathname.includes('less') || url.pathname.includes('js') || url.pathname.includes('.webp') || url.pathname.includes('.svg') || url.pathname.includes('.png') ) {
    return await serveFile(request, url.pathname.replace('/','') );
  }

  // User is logged in
  if ( await loginController.validateUser(request) === true ) {

    // View all tasks
    if ( url.pathname === "/" && request.method === "GET" ) {

      return await taskController.viewTasks(request);

    // Create new task
    } else if ( url.pathname === "/tasks" && request.method === "POST" ) {

      return await taskController.newTask(request);

    // Remove task
    } else if ( url.pathname.match("/tasks/del/[0-9]+") && request.method === "POST" ) {

      return await taskController.removeTask(request);

    // Create task entry
    } else if ( url.pathname.match("/tasks/[0-9]+/add-entry") && request.method === "POST" ) {

      return await taskEntryController.createTaskEntry(request);

    // View task entries
    } else if ( url.pathname.match("/tasks/[0-9]+") ) {

      return await taskEntryController.viewTaskEntries(request);

    // Remove task entry
    } else if ( url.pathname.match("/tasks/del-entry/[0-9]+") ) {

      return await taskEntryController.removeTaskEntry(request);

    // Request doesn't match any scenario
    } else {

      return new Response("Not found", { status: 404 });

    }

  } 

  // User is logged out
  if ( await loginController.validateUser(request) === false ) {
    
    // Show login form
    if ( request.method === 'GET' ) {

      return await loginController.showLoginForm(request);

    // Handle login form
    } else {

      return await loginController.handleLoginForm(request);

    }

  }
    
};

serve(handleRequest, { port: 7777});
