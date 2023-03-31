import { renderFile } from "../deps.js";
import * as taskService from "../services/taskService.js";
import * as requestUtils from "../utils/requestUtils.js";

const responseDetails = {
  headers: { "Content-Type": "text/html;charset=UTF-8" },
};

const viewTasks = async (setCookie) => {

  // Object to store all tasks
  const data = {
    tasks: await taskService.getAllTasks(),
  };

  // Show tasks and set cookie for logged in user
  if (setCookie) {

    const responseDetailsWithCookie = await requestUtils.setCookie(); 

    return new Response(await renderFile("tasks.eta", data), responseDetailsWithCookie);

  // Show tasks without setting new cookie
  } else {

    return new Response(await renderFile("tasks.eta", data), responseDetails);

  }

};

const newTask = async (request) => {

  // Handle form data
  const formData = await request.formData();
  const name = formData.get("name");

  // Create new task
  await taskService.createTask(name);

  return requestUtils.redirectTo("/");
};

const removeTask = async (request) => {

    // Parse path from url
    const url = new URL(request.url);
    const urlParts = url.pathname.split("/");

    // Delete task 
    await taskService.deleteById(urlParts[3]);
  
    return await requestUtils.redirectTo("/");
};

export { viewTasks, newTask, removeTask };