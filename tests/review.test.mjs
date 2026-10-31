import test from "node:test";
import assert from "node:assert/strict";
import { EXAMPLES, ReviewError, requestAnalysis, splitSteps, validateAnalysis, validateAttempt } from "../src/lib/review.mjs";
import { alternativeResult, mistakeResult, steps } from "./fixtures.mjs";

test("steps are trimmed, ordered, and ignore blank lines and Windows line endings", () => {
  assert.deepEqual(splitSteps(" 2x + 3 = 14\r\n\r\n 2x = 11 \n x = 5.5\n"), steps);
});

test("all three editable examples pass input validation", () => {
  assert.equal(Object.keys(EXAMPLES).length, 3);
  for (const example of Object.values(EXAMPLES)) assert.equal(validateAttempt(example.problem, example.steps.join("\n")).valid, true);
});

test("empty, oversized, excessive, and overlong individual steps are rejected", () => {
  assert.deepEqual(Object.keys(validateAttempt(" ", "\n").errors), ["problem", "steps"]);
  assert.equal(validateAttempt("x".repeat(501), "x = 1").valid, false);
  assert.equal(validateAttempt("x = 1", Array(21).fill("x = 1").join("\n")).valid, false);
  assert.equal(validateAttempt("x = 1", "x".repeat(501)).valid, false);
  assert.equal(validateAttempt("x = 1", Array(20).fill("x".repeat(400)).join("\n")).valid, false);
  assert.equal(validateAttempt("x = 1", Array(20).fill("x = 1").join("\n")).valid, true);
});

test("a valid analysis is copied without unknown fields", () => {
  const data = mistakeResult();
  const result = validateAnalysis({ ...data, unexpected: "ignored" }, steps);
  assert.deepEqual(result, data);
  assert.notEqual(result.practice.options, data.practice.options);
  assert.notEqual(result.workedCorrection, data.workedCorrection);
});

test("preserves progressive hints and mistake category when present on mistake_found", () => {
  const data = {
    ...mistakeResult(),
    hints: ["Check the parentheses.", "Multiply 2 by both x and 3.", "2(x + 3) becomes 2x + 6."],
    category: "distribution_error"
  };
  const result = validateAnalysis(data, steps);
  assert.deepEqual(result.hints, data.hints);
  assert.equal(result.category, "distribution_error");
});

for (const outcome of ["no_mistake_found", "insufficient_work", "unsupported_problem"]) {
  test(`accepts the ${outcome} outcome without invented mistake feedback`, () => {
    const result = validateAnalysis(alternativeResult(outcome), steps);
    assert.equal(result.firstIncorrectStep, null);
    assert.equal(Boolean(result.practice), outcome === "no_mistake_found");
  });
}

const invalidCases = {
  "unknown outcome": (data) => { data.outcome = "mastered"; },
  "missing explanation": (data) => { delete data.explanation; },
  "missing hint": (data) => { data.hint = ""; },
  "missing concept": (data) => { data.concept = ""; },
  "missing correction": (data) => { data.workedCorrection = []; },
  "invalid correction": (data) => { data.workedCorrection = [null]; },
  "line zero": (data) => { data.firstIncorrectStep = 0; },
  "out-of-range line": (data) => { data.firstIncorrectStep = 4; },
  "fractional line": (data) => { data.firstIncorrectStep = 1.5; },
  "nonmatching exact quote": (data) => { data.incorrectStepQuote = "2x + 6 = 14"; },
  "absent practice": (data) => { data.practice = null; },
  "incorrect number of options": (data) => { data.practice.options.pop(); },
  "duplicate option IDs": (data) => { data.practice.options[1].id = "a"; },
  "duplicate option text": (data) => { data.practice.options[1].text = data.practice.options[0].text; },
  "unknown correct option": (data) => { data.practice.correctOptionId = "z"; },
  "empty option text": (data) => { data.practice.options[0].text = ""; },
  "excessively long content": (data) => { data.explanation = "x".repeat(3001); }
};

for (const [name, mutate] of Object.entries(invalidCases)) {
  test(`rejects ${name}`, () => {
    const data = mistakeResult();
    mutate(data);
    assert.throws(() => validateAnalysis(data, steps), ReviewError);
  });
}

test("rejects invalid root values and contradictory alternative outcomes", () => {
  for (const data of [null, [], "text", {}]) assert.throws(() => validateAnalysis(data, steps), ReviewError);
  assert.throws(() => validateAnalysis({ ...mistakeResult(), outcome: "no_mistake_found" }, steps), ReviewError);
  assert.throws(() => validateAnalysis({ ...alternativeResult("insufficient_work"), practice: mistakeResult().practice }, steps), ReviewError);
});

test("API uses the planned route, JSON body and cancellation signal", async () => {
  const payload = { problem: "2(x + 3) = 14", steps };
  const controller = new AbortController();
  const result = await requestAnalysis(payload, {
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      assert.equal(url, "/api/analyze");
      assert.equal(options.method, "POST");
      assert.equal(options.signal, controller.signal);
      assert.deepEqual(JSON.parse(options.body), payload);
      return Response.json(mistakeResult());
    }
  });
  assert.equal(result.outcome, "mistake_found");
});

for (const [status, message] of [[400, /couldn’t accept/], [404, /isn’t connected yet/], [413, /too long/], [429, /busy/], [500, /couldn’t complete/], [503, /unavailable/], [504, /too long/]]) {
  test(`API ${status} gives a safe, actionable error`, async () => {
    await assert.rejects(requestAnalysis({ steps }, { fetchImpl: async () => new Response("sensitive backend details", { status }) }), message);
  });
}

test("invalid JSON and HTML success responses cannot masquerade as feedback", async () => {
  for (const response of [new Response("<html>SPA fallback</html>"), new Response("{invalid", { headers: { "Content-Type": "application/json" } })]) {
    await assert.rejects(requestAnalysis({ steps }, { fetchImpl: async () => response }), /couldn’t be verified/);
  }
});

test("network errors and cancellation propagate to the controller", async () => {
  for (const error of [new TypeError("offline"), new DOMException("Aborted", "AbortError")]) {
    await assert.rejects(requestAnalysis({ steps }, { fetchImpl: async () => { throw error; } }), (actual) => actual === error);
  }
});