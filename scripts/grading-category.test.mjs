import assert from "node:assert/strict";
import test from "node:test";
import { loadRoute } from "./load-route-test.mjs";

const { gradingCategoryLabel } = loadRoute("lib/grading-category.ts", {});

test("lower and higher grading categories follow the class terminology", () => {
  for (const name of ["Aikido", "Karate"]) {
    assert.equal(gradingCategoryLabel(name, "mudansha"), "Mudansha (Kyu)");
    assert.equal(gradingCategoryLabel(name, "yudansha"), "Yudansha (Dan)");
  }
  for (const name of ["Taijiquan", "Xingyiquan", "Kungfu Kids", "KungfuKids", "Bagua", "Baguazhang"]) {
    assert.equal(gradingCategoryLabel(name, "mudansha"), "Shengwei");
    assert.equal(gradingCategoryLabel(name, "yudansha"), "Shiwei");
  }
  assert.equal(gradingCategoryLabel(null, "yudansha"), "Higher category");
  assert.equal(gradingCategoryLabel("Taijiquan", null), "Grade");
});
