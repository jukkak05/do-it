import { executeQuery } from "../database/database.js";

const createTask = async (name) => {

    // Insert into table tasks with task name
    await executeQuery(
        "INSERT INTO tasks (name) VALUES ($name);",
        { name: name }
    );

};

const deleteById = async (id) => {

    // Delete from table tasks with task id
    await executeQuery(
        "DELETE FROM tasks WHERE id = ($id);",
        { id: id } 
    );

};

const getAllTasks = async () => {

    // Get all from table tasks
    let result = await executeQuery(
        "SELECT * FROM tasks;"
    );
    return result.rows; 

};

export { createTask, deleteById, getAllTasks };
