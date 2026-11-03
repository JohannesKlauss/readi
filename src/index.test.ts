import { expect, test } from "vite-plus/test";
import { fn } from "./index";



test("fn", () => {
  expect(fn()).toBe("Hello, Vite+!");
});
