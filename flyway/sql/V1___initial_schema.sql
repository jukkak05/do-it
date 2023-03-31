CREATE TABLE tasks (
  id SERIAL PRIMARY KEY, 
  name TEXT NOT NULL
);

CREATE TABLE task_entries ( 
  ID SERIAL PRIMARY KEY, 
  task_details TEXT NOT NULL, 
  task_id INTEGER REFERENCES tasks(id)
);
