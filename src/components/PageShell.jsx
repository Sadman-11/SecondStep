import { Fragment } from "react";
import Icon from "./Icon.jsx";
import { NotebookArt, SecondStepLogo, Wordmark } from "./Brand.jsx";

export function Header() {
  return (
    <header className="topbar">
      <a href="/" className="brand" aria-label="SecondStep home">
        <SecondStepLogo decorative />
        <Wordmark />
      </a>
      <span className="helper-badge">Your friendly math buddy</span>
    </header>
  );
}

export function Intro() {
  return (
    <section className="hero" id="about" aria-labelledby="page-title">
      <div className="hero-copy">
        <span className="eyebrow">Math practice, minus the stress!</span>
        <h1 id="page-title">
          Every mistake helps your
          <br className="desktop-only" /> math brain grow.
        </h1>
        <p>
          Show us your algebra problem and what you tried. We’ll celebrate the parts you nailed, spot the
          tricky bit, and help you take the next step.
        </p>
        <div className="benefits">
          <span className="benefit green">🌱 Tiny hints, one at a time</span>
          <span className="benefit peach">📷 Snap your notebook</span>
          <span className="benefit lilac">✨ No grades. No pressure.</span>
        </div>
      </div>
      <div className="art-wrap" aria-hidden="true">
        <span className="pep-talk">You’ve got this!</span>
        <NotebookArt />
      </div>
    </section>
  );
}

const STAGES = [
  ["attempt", "Show your work"],
  ["feedback", "Get a helpful hint"],
  ["practice", "Try it again"]
];

export function Journey({ stage, passed }) {
  return (
    <nav className="progress" aria-label="Learning steps">
      <ol>
        {STAGES.map(([name, label], index) => {
          const complete = index < stage || (index === 2 && passed);
          return (
            <Fragment key={name}>
              {index > 0 && <li className="progress-connector" aria-hidden="true" />}
              <li
                id={`stage-${name}`}
                className={`progress-step${stage === index ? " active" : ""}${complete ? " complete" : ""}`}
                aria-current={stage === index ? "step" : undefined}
              >
                <b>{complete ? <Icon name="check" size={14} /> : index + 1}</b>
                <span>{label}</span>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function Features() {
  return (
      <section className="features" id="how-it-works" aria-label="How SecondStep helps you">
        <article className="feature green-top">
          <span className="feature-icon green-icon" aria-hidden="true">
            <Icon name="type" size={26} />
          </span>
          <div>
            <h3>Write it or snap it</h3>
            <p>Type your work or take a quick picture of your notebook. Both work great!</p>
          </div>
        </article>
        <article className="feature orange-top">
          <span className="feature-icon orange-icon" aria-hidden="true">
            <Icon name="search" size={27} />
          </span>
          <div>
            <h3>Find the tiny slip</h3>
            <p>No big red Xs here. We’ll show you exactly where things got a little wobbly.</p>
          </div>
        </article>
        <article className="feature purple-top">
          <span className="feature-icon purple-icon" aria-hidden="true">
            <Icon name="lightbulb" size={26} />
          </span>
          <div>
            <h3>Unlock gentle hints</h3>
            <p>Get one bite-sized clue at a time, so you still get the “I did it!” feeling.</p>
          </div>
        </article>
      </section>
  );
}

export function SiteFooter() {
  return (
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <SecondStepLogo decorative />
              <Wordmark />
            </div>
            <p>
              Small hints. Big “aha!” moments.
              <br />A calmer way for kids to practice algebra.
            </p>
            <span className="footer-cheer">🌱 Keep growing, one step at a time.</span>
          </div>

          <nav className="footer-links" aria-label="Explore">
            <h3>Explore</h3>
            <a href="#workspace">Start practicing</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">Why SecondStep?</a>
          </nav>

          <div className="footer-safety">
            <span className="shield" aria-hidden="true">✓</span>
            <div>
              <h3>Safe space for learning</h3>
              <p>No accounts, no grades, and no pressure. Your work stays in this session.</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SecondStep</span>
          <span>Made with patience for growing math brains.</span>
          <code>2x + courage = you’ve got this!</code>
        </div>
      </footer>
  );
}
