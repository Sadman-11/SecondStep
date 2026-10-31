import test from "node:test";
import assert from "node:assert/strict";
import { createSession, getOutcome, sessionReducer as reduce } from "../src/lib/session.mjs";
import { alternativeResult, mistakeResult, steps } from "./fixtures.mjs";

function reviewed() {
  let state = reduce(createSession(), { type: "example", name: "distribution" });
  state = reduce(state, { type: "review-start", requestId: 1, steps });
  return reduce(state, { type: "review-success", requestId: 1, analysis: mistakeResult() });
}

test("sessions start empty and do not share mutable state", () => {
  const first = createSession();
  const second = createSession();
  assert.equal(first.view, "empty");
  assert.equal(first.analysis, null);
  assert.notEqual(first.errors, second.errors);
  assert.notEqual(first.submittedSteps, second.submittedSteps);
});

test("examples load controlled values, clear errors and request input focus", () => {
  const state = reduce(createSession(), { type: "example", name: "distribution" });
  assert.equal(state.problem, "2(x + 3) = 14");
  assert.equal(state.work, steps.join("\n"));
  assert.equal(state.selectedExample, "distribution");
  assert.equal(state.focusTarget, "problem");
  assert.match(state.announcement, /example loaded/);
});

test("edits invalidate the full review/practice state without mutating the old state", () => {
  let previous = reviewed();
  previous = reduce(previous, { type: "practice-select", id: "b" });
  previous = reduce(previous, { type: "practice-submit" });
  const next = reduce(previous, { type: "input", field: "work", value: "x = 4" });
  assert.equal(previous.practiceStatus, "correct");
  assert.equal(next.work, "x = 4");
  assert.equal(next.analysis, null);
  assert.equal(next.view, "empty");
  assert.equal(next.requestId, null);
  assert.equal(next.selectedExample, null);
  assert.equal(next.selectedAnswer, "");
  assert.equal(next.practiceStatus, "unanswered");
  assert.ok(next.revision > previous.revision);
});

test("validation requests focus on the first invalid field", () => {
  const state = reduce(createSession(), { type: "invalid", errors: { steps: "Add a step" } });
  assert.equal(state.focusTarget, "steps");
  assert.equal(state.errors.steps, "Add a step");
});

test("reviews capture a step snapshot and focus feedback on completion", () => {
  const source = [...steps];
  const loading = reduce(createSession(), { type: "review-start", requestId: 2, steps: source });
  source[0] = "changed";
  assert.deepEqual(loading.submittedSteps, steps);
  assert.equal(loading.stage, 1);
  const ready = reduce(loading, { type: "review-success", requestId: 2, analysis: mistakeResult() });
  assert.equal(ready.view, "result");
  assert.equal(ready.focusTarget, "feedback");
});

test("stale successes and failures are ignored after input, reset, or a newer request", () => {
  const loading = reduce(createSession(), { type: "review-start", requestId: 1, steps });
  for (const action of [
    { type: "input", field: "problem", value: "x = 2" },
    { type: "reset" },
    { type: "example", name: "balancing" },
    { type: "review-start", requestId: 2, steps }
  ]) {
    const next = reduce(loading, action);
    assert.equal(reduce(next, { type: "review-success", requestId: 1, analysis: mistakeResult() }), next);
    assert.equal(reduce(next, { type: "review-error", requestId: 1, message: "late" }), next);
  }
});

test("request errors preserve work and reset the current journey stage", () => {
  let state = reduce(createSession(), { type: "example", name: "distribution" });
  state = reduce(state, { type: "review-start", requestId: 1, steps });
  state = reduce(state, { type: "review-error", requestId: 1, message: "Unavailable" });
  assert.equal(state.work, steps.join("\n"));
  assert.equal(state.view, "error");
  assert.equal(state.requestError, "Unavailable");
  assert.equal(state.stage, 0);
});

test("practice ignores missing/unknown choices and supports wrong answer, retry, success", () => {
  let state = reviewed();
  assert.equal(reduce(state, { type: "practice-submit" }), state);
  assert.equal(reduce(state, { type: "practice-select", id: "unknown" }), state);
  state = reduce(state, { type: "practice-select", id: "a" });
  state = reduce(state, { type: "practice-submit" });
  assert.equal(state.practiceStatus, "incorrect");
  assert.equal(reduce(state, { type: "practice-select", id: "b" }), state);
  state = reduce(state, { type: "practice-submit" });
  assert.equal(state.selectedAnswer, "");
  assert.equal(state.focusTarget, "firstOption");
  state = reduce(state, { type: "practice-select", id: "b" });
  state = reduce(state, { type: "practice-submit" });
  assert.equal(state.practiceStatus, "correct");
  assert.equal(state.focusTarget, "practiceReset");
  assert.equal(reduce(state, { type: "practice-submit" }), state);
});

test("reset clears controlled inputs and all results", () => {
  const state = reduce(reviewed(), { type: "reset" });
  assert.equal(state.problem, "");
  assert.equal(state.work, "");
  assert.equal(state.analysis, null);
  assert.equal(state.selectedExample, null);
  assert.equal(state.focusTarget, "problem");
});

test("page restoration invalidates feedback while keeping the current input", () => {
  const state = reduce(reviewed(), { type: "restore" });
  assert.equal(state.work, steps.join("\n"));
  assert.equal(state.analysis, null);
  assert.equal(state.view, "empty");
  assert.equal(state.announcement, "");
});

test("outcome summaries are conservative and unsupported work does not enable practice", () => {
  assert.match(getOutcome(alternativeResult("no_mistake_found")).title, /No mistake found/);
  for (const outcome of ["insufficient_work", "unsupported_problem"]) {
    const state = { ...reviewed(), analysis: alternativeResult(outcome) };
    assert.equal(reduce(state, { type: "practice-open" }), state);
    assert.equal(reduce(state, { type: "practice-submit" }), state);
    assert.equal(getOutcome(state.analysis).style, "is-neutral");
  }
});

test("unknown actions, examples, and fields do not alter session state", () => {
  const state = createSession();
  for (const action of [{ type: "unknown" }, { type: "example", name: "missing" }, { type: "input", field: "analysis", value: "unsafe" }]) assert.equal(reduce(state, action), state);
});

test("transcribe-success opens confirmation gate only for transcribed outcome and blocks retake outcomes", () => {
  const good = reduce(createSession(), {
    type: "transcribe-success",
    transcript: { outcome: "transcribed", problem: "2(x+3)=14", steps: ["2x+3=14"], warnings: [], unclearStepIndexes: [], problemUnclear: false }
  });
  assert.equal(good.isConfirmingTranscript, true);
  assert.equal(good.transcriptionError, "");

  const retake = reduce(createSession(), {
    type: "transcribe-success",
    transcript: { outcome: "needs_retake", problem: "", steps: [], warnings: ["Photo is too blurry to read."], unclearStepIndexes: [], problemUnclear: false }
  });
  assert.equal(retake.isConfirmingTranscript, false);
  assert.equal(retake.transcript, null);
  assert.equal(retake.transcriptionError, "Photo is too blurry to read.");
});

test("transcript-edit invalidates stale review and reveal-next-hint increments up to available hints", () => {
  let state = reduce(reviewed(), {
    type: "review-success",
    requestId: 1,
    analysis: { ...mistakeResult(), hints: ["H1", "H2", "H3"] }
  });
  state = reduce({ ... reviewed(), analysis: { ...mistakeResult(), hints: ["H1", "H2", "H3"] } }, { type: "reveal-next-hint" });
  assert.equal(state.revealedHintCount, 2);
  state = reduce(state, { type: "reveal-next-hint" });
  assert.equal(state.revealedHintCount, 3);
  state = reduce(state, { type: "reveal-next-hint" });
  assert.equal(state.revealedHintCount, 3);

  const edited = reduce(state, { type: "transcript-edit" });
  assert.equal(edited.view, "empty");
  assert.equal(edited.analysis, null);
  assert.equal(edited.revealedHintCount, 1);
});