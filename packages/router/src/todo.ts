import { and, desc, eq } from "@repo/db";
import { todos, user } from "@repo/db/schema";
import {
  apiTodo,
  apiTodoCreate,
  apiTodoId,
  apiTodoList,
  apiTodoUpdate,
  apiTodoWithAuthor,
} from "@repo/validators";
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure } from "./trpc";
import type { RouterOutput } from "./utils";

export type TodoAllProcedure = RouterOutput["todos"]["all"];

const todoRouter = {
  all: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/todos", tags: ["todos"] } })
    .output(apiTodoList)
    .query(({ ctx }) => {
      return ctx.db.query.todos.findMany({
        where: eq(todos.userId, ctx.session.user.id),
        columns: {
          id: true,
          text: true,
          description: true,
          status: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: desc(todos.createdAt),
      });
    }),

  byId: protectedProcedure
    .meta({
      openapi: { method: "GET", path: "/todos/{id}", tags: ["todos"] },
    })
    .input(apiTodoId)
    .output(apiTodoWithAuthor)
    .query(async ({ ctx, input }) => {
      const [dbTodo] = await ctx.db
        .select({
          id: todos.id,
          text: todos.text,
          description: todos.description,
          status: todos.status,
          active: todos.active,
          createdAt: todos.createdAt,
          updatedAt: todos.updatedAt,
          author: {
            id: user.id,
            name: user.name,
          },
        })
        .from(todos)
        .innerJoin(user, eq(todos.userId, user.id))
        .where(
          and(eq(todos.id, input.id), eq(todos.userId, ctx.session.user.id))
        );

      if (!dbTodo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No such todo with ID ${input.id}`,
        });
      }
      return dbTodo;
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/todos", tags: ["todos"] } })
    .input(apiTodoCreate)
    .output(apiTodo)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(todos)
        .values({
          userId: ctx.session.user.id,
          ...input,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create todo",
        });
      }
      return created;
    }),

  update: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/todos/{id}", tags: ["todos"] },
    })
    .input(apiTodoUpdate)
    .output(apiTodo)
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      const [updated] = await ctx.db
        .update(todos)
        .set(changes)
        .where(and(eq(todos.id, id), eq(todos.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No such todo with ID ${id}`,
        });
      }
      return updated;
    }),

  delete: protectedProcedure
    .meta({
      openapi: { method: "DELETE", path: "/todos/{id}", tags: ["todos"] },
    })
    .input(apiTodoId)
    .output(apiTodo)
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(todos)
        .where(
          and(eq(todos.id, input.id), eq(todos.userId, ctx.session.user.id))
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No such todo with ID ${input.id}`,
        });
      }
      return deleted;
    }),
} satisfies TRPCRouterRecord;

export default todoRouter;
