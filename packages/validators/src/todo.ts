import { TodoStatus, todos } from "@repo/db/schema";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

// The `status` override must restate the column's default, otherwise
// drizzle-zod's inference for "has a DB default => optional" is lost and
// every create call is forced to pass status explicitly.
const todoInsertSchema = createInsertSchema(todos, {
  status: z.enum(TodoStatus).default(TodoStatus.NOT_STARTED),
});

export const apiTodoCreate = todoInsertSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Same reasoning as the insert override above: createUpdateSchema does not
// automatically re-apply "optional" to a column override you supply.
const todoUpdateSchema = createUpdateSchema(todos, {
  status: z.enum(TodoStatus).optional(),
});

// `id` is required (unlike the rest of the update fields) because the REST
// route derived from this schema is `PATCH /todos/{id}` - trpc-to-openapi
// needs a required field to map onto the URL path parameter.
export const apiTodoUpdate = todoUpdateSchema
  .omit({ userId: true, createdAt: true, updatedAt: true })
  .extend({ id: z.uuid() });

export const apiTodoId = z.object({ id: z.uuid() });

// `userId` is an internal ownership key, never echoed back to a client
// that by definition already knows it owns the resource.
export const apiTodo = createSelectSchema(todos, {
  status: z.enum(TodoStatus),
}).omit({ userId: true });

export const apiTodoWithAuthor = apiTodo.extend({
  author: z.object({ id: z.string(), name: z.string() }),
});

export const apiTodoList = z.array(apiTodo);

export type TodoCreate = z.infer<typeof apiTodoCreate>;
export type TodoUpdate = z.infer<typeof apiTodoUpdate>;
export type TodoId = z.infer<typeof apiTodoId>;
export type ApiTodo = z.infer<typeof apiTodo>;
export type ApiTodoWithAuthor = z.infer<typeof apiTodoWithAuthor>;
