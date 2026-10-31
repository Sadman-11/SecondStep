// Synthetic fixtures are only imported by tests, never by the production frontend.
export const steps = ["2x + 3 = 14", "2x = 11", "x = 5.5"];

export function mistakeResult() {
  return {
    outcome: "mistake_found",
    firstIncorrectStep: 1,
    incorrectStepQuote: steps[0],
    concept: "Distributing across parentheses",
    explanation: "The multiplier applies to both terms inside the parentheses, not just x.",
    hint: "You multiplied x by 2. What happens when you also multiply 3 by 2?",
    workedCorrection: ["2x + 6 = 14", "2x = 8", "x = 4"],
    practice: {
      question: "Which is the correct expansion of 3(x + 2) = 18?",
      options: [
        { id: "a", text: "3x + 2 = 18" },
        { id: "b", text: "3x + 6 = 18" },
        { id: "c", text: "x + 6 = 18" },
        { id: "d", text: "3x + 5 = 18" }
      ],
      correctOptionId: "b",
      explanation: "Multiply both terms by 3: 3 × x + 3 × 2 = 3x + 6."
    }
  };
}

export function alternativeResult(outcome) {
  const data = mistakeResult();
  return {
    ...data,
    outcome,
    firstIncorrectStep: null,
    incorrectStepQuote: null,
    concept: "",
    hint: outcome === "insufficient_work" ? "Include the steps between the problem and your answer." : "",
    explanation: {
      no_mistake_found: "No incorrect transformation was found in the steps you shared.",
      insufficient_work: "There are not enough intermediate steps to check how you got your answer.",
      unsupported_problem: "This workspace supports distribution, negative signs, and single-variable linear equations."
    }[outcome],
    workedCorrection: [],
    practice: outcome === "no_mistake_found" ? data.practice : null
  };
}