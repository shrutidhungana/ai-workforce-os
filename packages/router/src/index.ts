import type { AuthInstance } from "@repo/auth/server";
import type { DatabaseInstance } from "@repo/db/client";
import todoRouter from "./todo";
import {
  createCallerFactory,
  createTRPCContext as createTRPCContextInternal,
  createTRPCRouter,
} from "./trpc";

export const appRouter = createTRPCRouter({
  todos: todoRouter,
});

export const createCaller = createCallerFactory(appRouter);

export const createTRPCContext = ({
  auth,
  db,
  headers,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
  headers: Headers;
}) => createTRPCContextInternal({ auth, db, headers });

export type AppRouter = typeof appRouter;
export type { TodoAllProcedure } from "./todo";
export type { RouterOutput } from "./utils";
