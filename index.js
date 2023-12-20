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

handlebars.registerHelper("ifEqual", function (a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});

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

const filterBtns = handlebars.compile(
  readFileSync(`${__dirname}/views/partials/filter-btns.hbs`, "utf8")
);

const noTodos = handlebars.compile(
  readFileSync(`${__dirname}/views/partials/no-todo.hbs`, "utf8")
);

const FILTER_MAP = {
  all: () => true,
  active: (todo) => !todo.completed,
  completed: (todo) => todo.completed,
};

const FILTER_NAMES = Object.keys(FILTER_MAP);

app.get("/", (req, res) => {
  const { todos } = db.data;
  const filter = req.query.filter ?? "all";
  const filteredTodos = todos.filter(FILTER_MAP[filter]);
  res.render("index", {
    partials: {
      todoInput,
      todoItem,
      filterBtns,
      noTodos,
    },
    todos: filteredTodos,
    filters: FILTER_NAMES.map((name) => ({
      name,
      count: todos.filter(FILTER_MAP[name]).length,
    })),
    filter,
    noTodos: filteredTodos.length,
  });
});

app.post("/todos", async (req, res) => {
  const { todo, filter: filter = "All" } = req.body;
  const newTodo = { id: uuid(), name: todo, completed: false };
  db.data.todos.push(newTodo);

  const { todos } = db.data;
  const filteredTodos = todos.filter(FILTER_MAP[filter]);

  await db.write();

  setTimeout(() => {
    res.render("index", {
      layout: false,
      partials: {
        todoInput,
        todoItem,
        filterBtns,
        noTodos,
      },
      filters: FILTER_NAMES.map((name) => ({
        name,
        count: db.data.todos.filter(FILTER_MAP[name]).length,
      })),
      todos: filteredTodos,
      filter,
      noTodos: filteredTodos.length,
    });
  }, 1000);
});

app.patch("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  const filter = req.query.filter ?? "all";
  if (!todo) return res.sendStatus(404).send("Todo not found");
  const filteredTodos = todos.filter(FILTER_MAP[filter]);

  todo.completed = !todo.completed;
  await db.write();
  res.render("index", {
    layout: false,
    partials: {
      todoInput,
      todoItem,
      filterBtns,
      noTodos,
    },
    todos: filteredTodos,
    filters: FILTER_NAMES.map((name) => ({
      name,
      count: db.data.todos.filter(FILTER_MAP[name]).length,
    })),
    filter,
    noTodos: filteredTodos.length,
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

  const filter = req.query.filter ?? "all";
  return res.render("partials/filter-btns", {
    layout: false,
    partials: {
      noTodos,
    },
    filters: FILTER_NAMES.map((name) => ({
      name,
      count: db.data.todos.filter(FILTER_MAP[name]).length,
    })),
    filter,
    noTodos: db.data.todos.filter(FILTER_MAP[filter]).length,
  });
});

app.get("/todos/:id/edit", (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  const filter = req.query.filter ?? "all";
  if (!todo) return res.sendStatus(404).send("Todo not found");
  res.render("partials/todo-item-edit", {
    layout: false,
    ...todo,
    filter,
    noTodos: filter.length,
  });
});

app.get("/todos/:id", (req, res) => {
  const { id } = req.params;
  const { todos } = db.data;
  const todo = todos.find((todo) => todo.id === id);
  const filter = req.query.filter ?? "all";
  if (!todo) return res.sendStatus(404).send("Todo not found");
  res.render("partials/todo-item", {
    layout: false,
    ...todo,
    filter,
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
