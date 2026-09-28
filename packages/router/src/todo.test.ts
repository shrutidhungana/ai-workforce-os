import type { AuthInstance } from "@repo/auth/server";
import { eq } from "@repo/db";
import { createDb, type DatabaseInstance } from "@repo/db/client";
import { session as sessionTable, user as userTable } from "@repo/db/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCaller } from "./index";

type Session = AuthInstance["$Infer"]["Session"];

const db: DatabaseInstance = createDb({
  databaseUrl: process.env.DATABASE_URL,
});

const createTestSession = async (label: string): Promise<Session> => {
  const [dbUser] = await db
    .insert(userTable)
    .values({
      id: crypto.randomUUID(),
      name: `Test User ${label}`,
      email: `test-${label}-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    })
    .returning();

  if (!dbUser) {
    throw new Error("Failed to create test user");
  }

  const [dbSession] = await db
    .insert(sessionTable)
    .values({
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      userId: dbUser.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();

  if (!dbSession) {
    throw new Error("Failed to create test session");
  }

  return { user: dbUser, session: dbSession } as Session;
};

describe("todo router", () => {
  let sessionA: Session;
  let sessionB: Session;

  beforeAll(async () => {
    sessionA = await createTestSession("a");
    sessionB = await createTestSession("b");
  });

  afterAll(async () => {
    // Deleting the user cascades to their sessions and todos.
    await db.delete(userTable).where(eq(userTable.id, sessionA.user.id));
    await db.delete(userTable).where(eq(userTable.id, sessionB.user.id));
  });

  it("lets a signed-in user create and then list their own todo", async () => {
    const caller = createCaller({ db, session: sessionA });

    const created = await caller.todos.create({ text: "Write the report" });
    expect(created.text).toBe("Write the report");

    const all = await caller.todos.all();
    expect(all.some((todo) => todo.id === created.id)).toBe(true);
  });

  it("rejects unauthenticated access", async () => {
    const caller = createCaller({ db, session: null });

    await expect(
      caller.todos.create({ text: "Should not be allowed" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not let one user read, update, or delete another user's todo", async () => {
    const callerA = createCaller({ db, session: sessionA });
    const callerB = createCaller({ db, session: sessionB });

    const created = await callerA.todos.create({ text: "Private to A" });

    await expect(callerB.todos.byId({ id: created.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      callerB.todos.update({ id: created.id, text: "Hijacked" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      callerB.todos.delete({ id: created.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const listB = await callerB.todos.all();
    expect(listB.some((todo) => todo.id === created.id)).toBe(false);
  });
});
