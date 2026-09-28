import type { AuthInstance } from "@repo/auth/server";
import type { DatabaseInstance } from "@repo/db/client";
import {
  appRouter,
  createTRPCContext as createRouterContext,
} from "@repo/router";
import {
  createOpenApiFetchHandler,
  generateOpenApiDocument,
} from "trpc-to-openapi";

export const REST_ENDPOINT = "/api/rest";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "AI Workforce OS API",
  description: "REST surface generated from the tRPC todo router.",
  version: "0.1.0",
  baseUrl: REST_ENDPOINT,
});

export const createApi = ({
  auth,
  db,
}: {
  auth: AuthInstance;
  db: DatabaseInstance;
}) => {
  const createTRPCContext = ({ headers }: { headers: Headers }) =>
    createRouterContext({ auth, db, headers });

  return {
    trpcRouter: appRouter,
    createTRPCContext,
    openApiDocument,
    handleRestRequest: (req: Request) =>
      createOpenApiFetchHandler({
        router: appRouter,
        endpoint: REST_ENDPOINT,
        req,
        createContext: () => createTRPCContext({ headers: req.headers }),
      }),
  };
};

export type {
  AppRouter,
  RouterOutput,
  TodoAllProcedure,
} from "@repo/router";
