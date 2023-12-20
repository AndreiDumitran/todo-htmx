import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import handlebars from "handlebars";
import { readFileSync } from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { v4 as uuid } from "uuid";

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "db.json");

const app = express();
app.engine(
  ".hbs",
  engine({
    handlebars: handlebars,
    extname: ".hbs",
  })
);
app.set("view engine", ".hbs");
app.set("views", [`${__dirname}/views`]);

app.use(express.static(`${__dirname}/public`));
app.use(express.urlencoded({ extended: false }));

const adapter = new JSONFile(file);
const defaultData = { todos: [] };
const db = new Low(adapter, defaultData);
await db.read();

const todoInput = handlebars.compile(
  readFileSync(`${__dirname}/views/partials/todo-input.hbs`, "utf8")
);

const todoItem = handlebars.compile(
  readFileSync(`${__dirname}/views/partials/todo-item.hbs`, "utf8")
);

const todoItemEdit = handlebars.compile(
  readFileSync(`${__dirname}/views/partials/todo-item-edit.hbs`, "utf8")
);

app.get("/", (req, res) => {
  const { todos } = db.data;
  res.render("index", {
    partials: {
      todoInput,
      todoItem,
    },
    todos,
  });
});

app.post("/todos", async (req, res) => {
  const { todo } = req.body;
  const newTodo = { id: uuid(), name: todo, completed: false };
  db.data.todos.push(newTodo);

  const { todos } = db.data;

  await db.write();

  setTimeout(() => {
    res.render("index", {
      layout: false,
      partials: {
        todoInput,
        todoItem,
      },
      todos,
    });
  }, 1000);
});

app.patch("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  if (!todo) return res.sendStatus(404).send("Todo not found");

  todo.completed = !todo.completed;
  await db.write();
  res.render("index", {
    layout: false,
    partials: {
      todoInput,
      todoItem,
    },
    todos,
  });
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  if (!todo) return res.sendStatus(404).send("Todo not found");
  const index = todos.indexOf(todo);
  todos.splice(index, 1);
  await db.write();
  res.send("");
});

app.get("/todos/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  if (!todo) return res.sendStatus(404).send("Todo not found");
  res.render("partials/todo-item-edit", {
    layout: false,
    ...todo,
  });
});

app.get("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  if (!todo) return res.sendStatus(404).send("Todo not found");
  res.render("partials/todo-item", {
    layout: false,
    ...todo,
  });
});

app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  if (!todo) return res.sendStatus(404).send("Todo not found");
  todo.name = req.body.name;
  await db.write();
  res.render("partials/todo-item", {
    layout: false,
    ...todo,
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
