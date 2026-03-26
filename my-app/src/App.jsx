import { useState, useEffect } from "react" // Import React hooks
import { supabase } from "./supabaseClient" // Import Supabase connection
export default function App() {
// STATE: stores all tasks from database
const [tasks, setTasks] = useState([])
// STATE: stores user input
const [input, setInput] = useState("")
// Runs once when page loads
useEffect(() => {
fetchTasks() // Call function to get tasks
}, [])
// READ: Fetch tasks from Supabase
const fetchTasks = async () => {
// Get all rows from 'tasks' table
const { data, error } = await supabase
.from("tasks") // Select table
.select("*") // Get all columns
if (error) {
console.log("Error fetching:", error)
} else {
setTasks(data) // Save data into state
}
}
// CREATE: Add new task
const addTask = async () => {
// Prevent adding empty input
if (!input) return
// Insert new row into database
const { error } = await supabase
.from("tasks")
.insert([
{ name: input, is_done: false } // Default: not done
])
if (error) {
console.log("Insert error:", error)
} else {
setInput("") // Clear input field
fetchTasks() // Refresh list
}
}
// UPDATE: Mark task as done
const markDone = async (id, currentStatus) => {
const { error } = await supabase
.from("tasks")
.update({
is_done: !currentStatus // Toggle true/false
})
.eq("id", id) // Target specific row
if (error) {
console.log("Update error:", error)
} else {
fetchTasks()
}
}
// DELETE: Remove task
const deleteTask = async (id) => {
const { error } = await supabase
.from("tasks")
.delete()
.eq("id", id)
if (error) {
console.log("Delete error:", error)
} else {
fetchTasks()
}
}
return (
<div style={{
padding: "20px",
fontFamily: "Arial"
}}>
<h1>TODO LIST</h1>
<h1>asdasd</h1>
{/* INPUT FIELD */}
<input
value={input} // current value
onChange={(e) => setInput(e.target.value)} // update state
style={{ padding: "5px", marginRight: "10px" }}
/>
{/* ADD BUTTON */}
<button onClick={addTask}>
Add Task
</button>
<ul>
{tasks.map(task => (
<li key={task.id} style={{
marginTop: "10px",
textDecoration: task.is_done ? "line-through" : "none"
}}>
{task.name}
{/* MARK DONE BUTTON */}
<button
onClick={() => markDone(task.id, task.is_done)}
style={{ marginLeft: "10px" }}
>
{task.is_done ? "Undo" : "Done"}
</button>
{/* DELETE BUTTON */}
<button
onClick={() => deleteTask(task.id)}
style={{ marginLeft: "10px" }}
>
Delete
</button>
</li>
))}
</ul>
</div>
)
}