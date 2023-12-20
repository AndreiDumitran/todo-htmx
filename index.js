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
      todos
    });
  }, 2000);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
