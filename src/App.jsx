import { useLearningSession } from "./hooks/useLearningSession.js";
import AttemptForm from "./components/AttemptForm.jsx";
import FeedbackPanel from "./components/FeedbackPanel.jsx";
import PracticeCard from "./components/PracticeCard.jsx";
import { Features, Header, Intro, Journey, SiteFooter } from "./components/PageShell.jsx";

export default function App() {
  const {
    state,
    dispatch,
    focusRefs,
    changeInput,
    loadExample,
    resetSession,
    setInputMode,
    handleImagePrepared,
    handleImageRotated,
    handleImageRemoved,
    transcribeImage,
    reviewAttempt
  } = useLearningSession();

  function handleSwitchToTyped(problem, work) {
    changeInput("problem", problem);
    changeInput("work", work);
    setInputMode("typed");
    dispatch({ type: "confirm-cancel" });
  }

  function handleEditFlaggedStep() {
    const flaggedIndex = state.analysis?.firstIncorrectStep;
    const confirmInput = flaggedIndex ? focusRefs.current[`confirmStep_${flaggedIndex}`] : null;
    if (state.isConfirmingTranscript && confirmInput) {
      confirmInput.focus();
    } else {
      focusRefs.current.steps?.focus();
    }
  }

  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to learning workspace
      </a>
      <Header />
      <div className="page-shell">
        <main>
          <Intro />
          <Journey stage={state.stage} passed={state.practiceStatus === "correct"} />
          <div
            id="session-status"
            className="session-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {state.announcement}
          </div>
          <div className="workspace" id="workspace" tabIndex={-1}>
            <AttemptForm
              state={state}
              focusRefs={focusRefs}
              onChange={changeInput}
              onExample={loadExample}
              onReset={resetSession}
              onSubmit={(e) => reviewAttempt(e)}
              onSetInputMode={setInputMode}
              onImagePrepared={handleImagePrepared}
              onImageRotated={handleImageRotated}
              onImageRemoved={handleImageRemoved}
              onTranscribe={transcribeImage}
              onConfirmAndReview={(payload) => reviewAttempt(null, payload)}
              onSwitchToTyped={handleSwitchToTyped}
              onTranscriptEdit={() => dispatch({ type: "transcript-edit" })}
            />
            <FeedbackPanel
              state={state}
              focusRefs={focusRefs}
              onRetry={() => reviewAttempt()}
              onPractice={() => dispatch({ type: "practice-open" })}
              onRevealNextHint={() => dispatch({ type: "reveal-next-hint" })}
              onEditFlaggedStep={handleEditFlaggedStep}
            />
          </div>
          <PracticeCard
            state={state}
            focusRefs={focusRefs}
            onSelect={(id) => dispatch({ type: "practice-select", id })}
            onSubmit={() => dispatch({ type: "practice-submit" })}
            onReset={resetSession}
          />
          <Features />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
