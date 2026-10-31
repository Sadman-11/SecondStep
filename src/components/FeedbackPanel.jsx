import { getOutcome } from "../lib/session.mjs";
import Icon from "./Icon.jsx";
import { BuddyFace } from "./Brand.jsx";

const CATEGORY_LABELS = {
  distribution: "Distribution",
  sign_error: "Sign handling",
  inverse_operation: "Inverse operation",
  arithmetic_slip: "Arithmetic",
  copying_error: "Copying a line",
  other: "Algebra rule"
};

const STATUS = {
  empty: "Ready when you are",
  loading: "Checking…",
  error: "Hmm, a hiccup",
  result: "All checked!"
};

export default function FeedbackPanel({
  state,
  focusRefs,
  onRetry,
  onPractice,
  onRevealNextHint,
  onEditFlaggedStep
}) {
  const { view, analysis, revealedHintCount = 1 } = state;
  const outcome = getOutcome(analysis);

  const availableHints =
    analysis?.hints && analysis.hints.length > 0
      ? analysis.hints
      : analysis?.hint
        ? [analysis.hint]
        : [];
  const visibleHints = availableHints.slice(0, revealedHintCount);
  const hasMoreHints = revealedHintCount < availableHints.length;

  return (
    <section
      className={`panel inspection is-${view}`}
      aria-labelledby="feedback-title"
      id="feedback-panel"
      aria-busy={view === "loading"}
    >
      <div className="panel-heading">
        <div>
          <h2
            id="feedback-title"
            tabIndex={-1}
            ref={(node) => {
              focusRefs.current.feedback = node;
            }}
          >
            Your math buddy
          </h2>
          <p>Let’s check each step together.</p>
        </div>
        <span id="feedback-badge" className={`status status-${view}`}>
          {STATUS[view]}
        </span>
      </div>

      {/* Empty state */}
      <div id="feedback-empty" className="inspection-body" hidden={view !== "empty"}>
        <BuddyFace />
        <div className="empty-lines" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="ready-copy">
          <h3>Your math buddy is ready!</h3>
          <p>Type your steps or add a photo. We’ll cheer for what’s working and give you a small hint if you get stuck.</p>
        </div>
      </div>

      {/* Loading state */}
      <div id="feedback-loading" className="feedback-state" hidden={view !== "loading"}>
        <span className="loading-spinner" aria-hidden="true" />
        <h3>Checking each step…</h3>
        <p>Your buddy is looking at every line, one at a time.</p>
      </div>

      {/* Error state */}
      <div id="feedback-error" className="feedback-state" hidden={view !== "error"}>
        <span className="state-icon" aria-hidden="true">!</span>
        <h3>We couldn’t finish the check</h3>
        <p id="request-error-message">{state.requestError}</p>
        <button type="button" id="retry-button" className="button button-secondary" onClick={onRetry}>
          <Icon name="reset" />
          Try again
        </button>
      </div>

      {/* Results */}
      <div id="feedback-result" className="feedback-result" hidden={view !== "result"}>
        <div id="outcome-banner" className={`outcome-banner ${outcome.style}`}>
          <span id="outcome-icon" className="outcome-icon" aria-hidden="true">
            {outcome.icon}
          </span>
          <div>
            <h3 id="outcome-title">{outcome.title}</h3>
            <p id="outcome-description">{analysis?.explanation}</p>
          </div>
        </div>

        <div className="reviewed-work">
          <div className="reviewed-work-header">
            <h3 className="field-kicker">Your steps</h3>
            {analysis?.firstIncorrectStep && (
              <button type="button" className="text-button" onClick={onEditFlaggedStep}>
                <Icon name="pencil" />
                <span>Fix line {analysis.firstIncorrectStep}</span>
              </button>
            )}
          </div>
          <ol id="reviewed-steps" className="check-list">
            {analysis &&
              state.submittedSteps.map((step, index) => {
                const stepNum = index + 1;
                const first = analysis.firstIncorrectStep;
                const isFirstError = stepNum === first;
                const isAfterError = Boolean(first) && stepNum > first;
                const rowClass = isFirstError
                  ? "step-needs-attention"
                  : isAfterError
                    ? "step-not-checked"
                    : "step-verified";

                return (
                  <li key={index} className={`check-row ${rowClass}`}>
                    <small aria-hidden="true">{stepNum}</small>
                    <code className="step-text">{step}</code>
                    <span className="step-label">
                      {isFirstError
                        ? "💡 Take another look"
                        : isAfterError
                          ? `Comes after line ${first}`
                          : "✓ Looks good"}
                    </span>
                  </li>
                );
              })}
          </ol>
        </div>

        {(analysis?.concept || analysis?.category) && (
          <div className="concept-row">
            {analysis?.concept && (
              <span id="concept-label" className="concept-label">
                {analysis.concept}
              </span>
            )}
            {analysis?.category && (
              <span className="category-pill">{CATEGORY_LABELS[analysis.category] || analysis.category}</span>
            )}
          </div>
        )}

        {visibleHints.length > 0 && (
          <div className="hints-container">
            {visibleHints.map((hintText, index) => (
              <div key={index} id={index === 0 ? "hint-card" : undefined} className="hint-card">
                <span className="hint-icon" aria-hidden="true">
                  <Icon name="lightbulb" />
                </span>
                <div>
                  <h3>{availableHints.length > 1 ? `Hint ${index + 1} of ${availableHints.length}` : "Here’s a hint"}</h3>
                  <p id={index === 0 ? "hint-text" : undefined}>{hintText}</p>
                </div>
              </div>
            ))}

            {hasMoreHints && (
              <button type="button" className="button button-secondary next-hint-btn" onClick={onRevealNextHint}>
                Show hint {revealedHintCount + 1} of {availableHints.length}
              </button>
            )}
          </div>
        )}

        <details
          key={state.revision}
          id="correction-details"
          className="correction-details"
          hidden={!analysis?.workedCorrection?.length}
        >
          <summary>
            See the full worked solution <Icon name="chevron" />
          </summary>
          <ol id="correction-steps" className="correction-steps">
            {analysis?.workedCorrection?.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>

        <a id="practice-link" className="practice-link" href="#practice-card" hidden={!analysis?.practice} onClick={onPractice}>
          Take your victory lap <Icon name="arrow" />
        </a>
      </div>
    </section>
  );
}
