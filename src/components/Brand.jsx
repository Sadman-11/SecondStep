// Brand assets from the SecondStep Figma Make design.

export function SecondStepLogo({ small = false, decorative = false }) {
  return (
    <svg
      className={small ? "secondstep-logo small" : "secondstep-logo"}
      viewBox="0 0 48 48"
      {...(decorative
        ? { "aria-hidden": "true", focusable: "false" }
        : { role: "img", "aria-label": "SecondStep logo" })}
    >
      <rect fill="#31AE88" height="44" rx="14" width="44" x="2" y="2" />
      <path
        d="M14 17.2c.9-4.6 4.6-7.2 9.9-7.2 5.7 0 9.6 3.1 9.6 7.7 0 4.1-2.7 6.6-7.4 9.8l-5.6 3.8h8.1v-3.1h5.2v7.3h-20v-4.1l9.2-6.8c3.6-2.7 5.2-4.3 5.2-6.4 0-2-1.7-3.3-4.3-3.3-2.5 0-4.2 1.3-4.8 3.8L14 17.2Z"
        fill="#FFFEF8"
      />
      <path d="M28.6 35.5h5.2v-4.2h4.8v8.4h-10Z" fill="#FFCE57" />
      <circle cx="38.6" cy="27.9" fill="#FFCE57" r="2.5" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Second<span>Step</span>
    </span>
  );
}

export function NotebookArt() {
  return (
    <svg className="notebook-art" viewBox="0 0 330 220" aria-hidden="true" focusable="false">
      <rect fill="#e4f7eb" height="220" rx="30" width="330" />
      <circle cx="48" cy="41" fill="#fff0a9" r="24" />
      <circle cx="281" cy="172" fill="#d5f5df" r="32" />
      <rect fill="#b7c6c1" height="174" rx="18" width="203" x="58" y="20" />
      <rect fill="#fffdfa" height="174" rx="18" stroke="#d8c9b6" strokeWidth="2" width="203" x="54" y="16" />
      {[42, 69, 96, 123, 150].map((y) => (
        <g key={y}>
          <rect fill="#f17957" height="7" rx="3.5" width="19" x="43" y={y} />
          <rect fill="#d7c8b6" height="7" rx="3.5" width="9" x="57" y={y} />
        </g>
      ))}
      <text className="art-code" x="79" y="44">2(x + 3) = 14</text>
      <path d="M78 54h160" stroke="#ffae72" strokeWidth="1.5" />
      <rect fill="#effaef" height="34" rx="8" stroke="#70c987" width="166" x="75" y="64" />
      <circle cx="89" cy="81" fill="#4ab968" r="9" />
      <path d="m85 81 3 3 5-7" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <text className="art-code small" x="106" y="85">2x + 6 = 14</text>
      <rect fill="#fff7e9" height="34" rx="8" stroke="#f5a849" width="166" x="75" y="104" />
      <circle cx="89" cy="121" fill="#f6a64c" r="9" />
      <text fill="white" fontFamily="sans-serif" fontSize="11" fontWeight="700" x="86" y="125">?</text>
      <text className="art-code small" x="106" y="125">2x = 8  (Hint!)</text>
      <rect fill="#f4efff" height="34" rx="8" stroke="#8b5bd0" width="166" x="75" y="144" />
      <circle cx="89" cy="161" fill="#8251c9" r="9" />
      <text fill="white" fontFamily="sans-serif" fontSize="11" x="86" y="165">★</text>
      <text className="art-code small purple" x="106" y="165">x = 4 You got it!</text>
      <g transform="translate(252 43) rotate(22)">
        <path d="M0 0h17v93l-8.5 18L0 93Z" fill="#f39a54" stroke="#313145" strokeWidth="2" />
        <path d="M0 0h17v16H0Z" fill="#f3b0bf" stroke="#313145" strokeWidth="2" />
        <path d="m0 93 8.5 18L17 93Z" fill="#f8dfbe" stroke="#313145" strokeWidth="2" />
      </g>
      <g transform="translate(274 163)">
        <path d="M7 2c-8-12-10-20-5-25 8 5 11 13 10 24M13 2c1-14 7-22 14-24 2 8-2 16-10 24" fill="#36ab70" />
        <path d="M1 0h23l-3 24H5Z" fill="#f36f4d" stroke="#303145" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** The buddy illustration shown in the empty feedback panel. */
export function BuddyFace() {
  return (
    <div className="friendly-face" aria-hidden="true">
      <div className="face">
        ••<span>⌣</span>
      </div>
      <div className="face-lines">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
