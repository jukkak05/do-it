import { executeQuery } from "../database/database.js";

const createTaskEntry = async (task_id, task_details) => {
    
    // Insert into table task_entries with task id and task details
    await executeQuery(
        "INSERT INTO task_entries (task_id, task_details) VALUES ($id, $details);",
        { id: task_id, details: task_details }
    );

};

const getTaskName = async (task_id) => {

    // Get name from table tasks with task id
    let result = await executeQuery(
        "SELECT * FROM tasks WHERE id = ($id);",
        { id: task_id }
    )
    return result.rows;

};

const getTaskEntries = async (task_id) => {
  
    // Get all from table task_entries with task id
    let result = await executeQuery(
        "SELECT * FROM task_entries WHERE task_id = ($id);",
        { id: task_id }
    );

    if (result.rows.length > 0) {
        return result.rows;
    } else {
        return false; 
    } 

};

const deleteTaskEntry = async (entry_id) => {

    // Delete from table task_entries with entry id
    await executeQuery(
        "DELETE FROM task_entries WHERE id = ($id);",
        { id: entry_id }
    );

}

export { createTaskEntry, getTaskName, getTaskEntries, deleteTaskEntry };
