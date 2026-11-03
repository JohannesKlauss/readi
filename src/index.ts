import {R} from "@praha/byethrow";

type Reader<R, A> = (deps: R) => A

// const getUsersPosts = (user: User) => read(({findForUser, logger}: GetUsersPostsDeps) => R.pipe(...)
function read<R, A>(
  run: Reader<R, A>,
): Reader<R, A> {
  return run;
}

function andThen<A, R2, B, E2>(fn: (value: A) => Reader<R2, R.ResultMaybeAsync<B, E2>>) {
  return <R1, E1>(reader: Reader<R1, R.ResultMaybeAsync<A, E1>>): Reader<R1 & R2, R.ResultMaybeAsync<B, E1 | E2>> =>
    deps => R.pipe(
      reader(deps),
      R.andThen((value: A) => fn(value)(deps)),
    )
}

function map<A, B>(fn: (value: A) => B) {
  return <R1, E>(reader: Reader<R1, R.ResultMaybeAsync<A, E>>): Reader<R1, R.ResultMaybeAsync<B, E>> =>
    deps => R.pipe(
      reader(deps),
      R.map((value: A) => fn(value))
    )
}

type User = {
  id: string
  name: string
  age: number
}

type UserRepo = {
  getById: (id: string) => R.ResultAsync<User, "UserNotFound">
  create: (name: string) => R.ResultAsync<User, "CreationError">
}

type Post = {
  id: string
  title: string
}

type PostRepo = {
  getById: (id: string) => R.ResultAsync<Post[], "PostNotFound">
  findForUser: (userId: string) => R.ResultAsync<Post[], "PostsNotFound">
  create: (name: string) => R.ResultAsync<Post, "CreationError">
}

type Logger = {
  debug: (msg: string) => void
}

type GetUserDeps = {
  getById: UserRepo['getById'],
  logger: Logger,
}

const getUser = (userId: string): Reader<GetUserDeps, R.ResultAsync<User, "UserTooYoung" | "UserNotFound">> => ({getById, logger}) => {
  return R.pipe(
    getById(userId),
    R.inspect(user => logger.debug(`found ${user.name}`)),
    R.andThrough(user => user.age >= 18 ? R.succeed() : R.fail("UserTooYoung"))
  )
}

type GetUsersPostsDeps = {
  findForUser: PostRepo['findForUser'],
  logger: Logger
}

const getUsersPosts = (user: User): Reader<GetUsersPostsDeps, R.ResultAsync<Post[], "EmptyPosts" | "PostsNotFound">> => ({findForUser, logger}) => {
  return R.pipe(
    findForUser(user.id),
    R.inspect(posts => logger.debug(`found ${posts.length} posts`)),
    R.andThrough(post => post.length >= 1 ? R.succeed() : R.fail("EmptyPosts"))
  )
}

export const runProgram = R.pipe(
  getUser("id1"),
  andThen(getUsersPosts),
  map(posts => posts.length)
)