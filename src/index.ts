import {R} from "@praha/byethrow";
import {isPromise} from "node:util/types";

type Reader<R, A> = (deps: R) => A

type InferR<R>
  = [R] extends [(...args: any[]) => Reader<infer U, any>] ? U
  : [R] extends [Reader<infer U, any>] ? U
    : never;

type InferA<R>
  = [R] extends [(...args: any[]) => Reader<any, infer U>] ? U
  : [R] extends [Reader<any, infer U>] ? U
    : never;

function andThen<R1 extends Reader<any, any>, R2 extends Reader<any, any>>(fn: (a: InferR<R1>) => R2): (result: R1) => Reader<InferR<R1> | InferR<R2>, InferA<R2>>;
function andThen<R1 extends Reader<any, any>, R2 extends Reader<any, any>>(fn: (a: InferR<R1>) => R2) {
  return (reader: R1) => {
    const apply = (r: R1) => {
      return fn(r);
    };

    return apply(reader);
  };
}

export function fn() {
  return R.pipe(
    getUser("id1"),
    andThen(getUsersPosts),
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

const getUser = (userId: string): Reader<[UserRepo['getById'], Logger], R.ResultAsync<User, "UserTooYoung" | "UserNotFound">> => ([getById, logger]) => {
  return R.pipe(
    getById(userId),
    R.inspect(user => logger.debug(`found ${user.name}`)),
    R.andThrough(user => user.age >= 18 ? R.succeed() : R.fail("UserTooYoung"))
  )
}

const getUsersPosts = (user: User): Reader<[PostRepo['findForUser'], Logger], R.ResultAsync<Post[], "EmptyPosts" | "PostsNotFound">> => ([findForUser, logger]) => {
  return R.pipe(
    findForUser(user.id),
    R.inspect(posts => logger.debug(`found ${posts.length} posts`)),
    R.andThrough(post => post.length >= 1 ? R.succeed() : R.fail("EmptyPosts"))
  )
}

