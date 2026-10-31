import Icon from "./Icon.jsx";

export default function PracticeCard({ state, focusRefs, onSelect, onSubmit, onReset }) {
  const practice = state.analysis?.practice;
  const answered = state.practiceStatus !== "unanswered";
  const correct = state.practiceStatus === "correct";
  const description = practice
    ? "One quick problem that uses the same idea. Show it who’s boss!"
    : state.analysis
      ? "Fix your steps above and check again to unlock your practice problem."
      : "After your check, you’ll get one quick problem to prove you’ve got it.";

  return (
    <section
      className={`follow-up${practice ? " is-unlocked" : ""}`}
      id="practice-card"
      aria-labelledby="practice-title"
    >
      <div className="follow-up-intro">
        <div>
          <span className="follow-up-kicker">Follow-up verification</span>
          <h2
            id="practice-title"
            tabIndex={-1}
            ref={(node) => {
              focusRefs.current.practice = node;
            }}
          >
            Your victory lap
          </h2>
          <p id="practice-description">{description}</p>
        </div>
        <code id="practice-locked" className="practice-locked" hidden={Boolean(practice)}>
          Complete a step check above to generate
        </code>
      </div>

      <form
        id="practice-form"
        className="practice-form"
        hidden={!practice}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <fieldset id="practice-fieldset" disabled={answered}>
          <legend id="practice-question">{practice?.question}</legend>
          <div id="practice-options" className="practice-options">
            {practice?.options.map((option, index) => (
              <label key={option.id} className="practice-option">
                <input
                  type="radio"
                  name="practice-answer"
                  id={`practice-option-${index}`}
                  value={option.id}
                  ref={
                    index === 0
                      ? (node) => {
                          focusRefs.current.firstOption = node;
                        }
                      : undefined
                  }
                  checked={state.selectedAnswer === option.id}
                  onChange={() => onSelect(option.id)}
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="practice-actions">
          <button
            type="submit"
            id="check-answer-button"
            className="button button-primary"
            disabled={!state.selectedAnswer}
            hidden={correct}
          >
            {state.practiceStatus === "incorrect" ? (
              "Pick another answer"
            ) : (
              <>
                Check my answer <Icon name="arrow" />
              </>
            )}
          </button>
          <button
            type="button"
            id="practice-reset-button"
            className="button button-secondary"
            hidden={!correct}
            onClick={onReset}
            ref={(node) => {
              focusRefs.current.practiceReset = node;
            }}
          >
            Start a new problem <Icon name="arrow" />
          </button>
        </div>

        <div
          id="practice-feedback"
          className={`practice-feedback${correct ? " is-success" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          hidden={!answered}
        >
          <h3 id="practice-feedback-title">
            {answered ? (correct ? "🎉 Practice check passed!" : "Not quite — you’re close!") : ""}
          </h3>
          <p id="practice-feedback-text">{answered ? practice?.explanation : ""}</p>
        </div>
      </form>
    </section>
  );
}
