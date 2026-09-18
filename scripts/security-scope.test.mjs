import assert from "node:assert/strict";
import test from "node:test";

import { assignmentCoversMember } from "./security-scope.mjs";


const member = {
  class_id: "class-a",
  dojo_id: "dojo-a",
};


test("class-only assignments match only the assigned class", () => {
  assert.equal(
    assignmentCoversMember({ class_id: "class-a", dojo_id: null }, member),
    true
  );
  assert.equal(
    assignmentCoversMember(
      { class_id: "class-b", dojo_id: null },
      member
    ),
    false
  );
});


test("dojo-only assignments match only the assigned dojo", () => {
  assert.equal(
    assignmentCoversMember({ class_id: null, dojo_id: "dojo-a" }, member),
    true
  );
  assert.equal(
    assignmentCoversMember({ class_id: null, dojo_id: "dojo-b" }, member),
    false
  );
});


test("combined assignments require both class and dojo to match", () => {
  assert.equal(
    assignmentCoversMember(
      { class_id: "class-a", dojo_id: "dojo-a" },
      member
    ),
    true
  );
  assert.equal(
    assignmentCoversMember(
      { class_id: "class-b", dojo_id: "dojo-a" },
      member
    ),
    false
  );
  assert.equal(
    assignmentCoversMember(
      { class_id: "class-a", dojo_id: "dojo-b" },
      member
    ),
    false
  );
});


test("an assignment with no class or dojo grants no scope", () => {
  assert.equal(
    assignmentCoversMember({ class_id: null, dojo_id: null }, member),
    false
  );
});
