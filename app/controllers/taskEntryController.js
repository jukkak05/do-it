import { renderFile } from "../deps.js";
import * as taskEntryService from "../services/taskEntryService.js";
import * as requestUtils from "../utils/requestUtils.js";

const responseDetails = {
  headers: { "Content-Type": "text/html;charset=UTF-8" },
};

const viewTaskEntries = async (request) => {

  // Parse id from url path
  const url = new URL(request.url); 
  const id = url.pathname.split('/')[2];

  // Data object to store task and task entries
  const data = {
    task: await taskEntryService.getTaskName(id),
    entries: await taskEntryService.getTaskEntries(id),
  };

  return new Response(await renderFile("task.eta", data), responseDetails);

};

const createTaskEntry = async (request) => {

  // Parse id from url path
  const url = new URL(request.url);
  const urlParts = url.pathname.split("/");
  const taskId = urlParts[2];

  // Handle form data
  const formData = await request.formData();
  const taskDetails = formData.get("description");

  // Create new task entry 
  await taskEntryService.createTaskEntry(taskId, taskDetails);

  return requestUtils.redirectTo(`/tasks/${taskId}`);

};

const removeTaskEntry = async (request) => {

  // Parse task id from url path
  const url = new URL(request.url);
  const urlParts = url.pathname.split("/")
  const taskUrl = request.headers.get('referer')

  // Delete task entry 
  await taskEntryService.deleteTaskEntry(urlParts[3]);

  return requestUtils.redirectTo(taskUrl); 

};

export { viewTaskEntries, createTaskEntry, removeTaskEntry };