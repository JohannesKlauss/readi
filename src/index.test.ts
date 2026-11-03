import { R } from "@praha/byethrow";
import { describe, expect, test, vi } from "vite-plus/test";
import { runProgram } from "./index.js";

type User = { id: string; name: string; age: number };
type Post = { id: string; title: string };

function makeDeps() {
  const user: User = { id: "id1", name: "Ada", age: 18 };
  const posts: Post[] = [{ id: "post1", title: "First post" }];

  const getById = vi.fn(
    async (_id: string): R.ResultAsync<User, "UserNotFound"> =>
      R.succeed(user),
  );

  const findForUser = vi.fn(
    async (_id: string): R.ResultAsync<Post[], "PostsNotFound"> =>
      R.succeed(posts),
  );

  const debug = vi.fn();

  return { getById, findForUser, logger: { debug } };
}

describe("runProgram", () => {
  test("uses injected dependencies and maps posts to their count", async () => {
    const deps = makeDeps();

    expect(deps.getById).not.toHaveBeenCalled();
    expect(deps.findForUser).not.toHaveBeenCalled();

    const result = await runProgram(deps);

    expect(result).toEqual(R.succeed(1));
    expect(deps.getById).toHaveBeenCalledWith("id1");
    expect(deps.findForUser).toHaveBeenCalledWith("id1");
    expect(deps.logger.debug).toHaveBeenCalledWith("found Ada");
    expect(deps.logger.debug).toHaveBeenCalledWith("found 1 posts");
  });

  test("does not fetch posts when the user is not found", async () => {
    const deps = makeDeps();
    deps.getById.mockResolvedValueOnce(R.fail("UserNotFound"));

    const result = await runProgram(deps);

    expect(result).toEqual(R.fail("UserNotFound"));
    expect(deps.findForUser).not.toHaveBeenCalled();
  });

  test("does not fetch posts when the user is too young", async () => {
    const deps = makeDeps();
    deps.getById.mockResolvedValueOnce(
      R.succeed({ id: "id1", name: "Ada", age: 17 }),
    );

    const result = await runProgram(deps);

    expect(result).toEqual(R.fail("UserTooYoung"));
    expect(deps.findForUser).not.toHaveBeenCalled();
  });

  test("preserves a post lookup failure", async () => {
    const deps = makeDeps();
    deps.findForUser.mockResolvedValueOnce(R.fail("PostsNotFound"));

    const result = await runProgram(deps);

    expect(result).toEqual(R.fail("PostsNotFound"));
    expect(deps.findForUser).toHaveBeenCalledWith("id1");
  });

  test("fails when the user has no posts", async () => {
    const deps = makeDeps();
    deps.findForUser.mockResolvedValueOnce(R.succeed([]));

    const result = await runProgram(deps);

    expect(result).toEqual(R.fail("EmptyPosts"));
  });
});
