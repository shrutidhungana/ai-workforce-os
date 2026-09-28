import { boolean, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { user } from "./auth";

export enum TodoStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export const todoStatusSchema = pgEnum("status", [
  TodoStatus.NOT_STARTED,
  TodoStatus.IN_PROGRESS,
  TodoStatus.COMPLETED,
]);

export const todos = pgTable("todos", {
  id: uuid().defaultRandom().primaryKey(),
  text: text("text").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  status: todoStatusSchema("status").default(TodoStatus.NOT_STARTED).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export type Todo = typeof todos.$inferSelect;
