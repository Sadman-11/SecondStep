// Icons drawn on a 20×20 grid come straight from the Figma Make design;
// the utility icons on a 24×24 grid cover states the design doesn't show
// (camera errors, image tools, disclosure chevrons).
const icons = {
  // Figma Make set (20×20)
  camera: [20, <><path d="M4 7.5h2l1.2-2h5.6l1.2 2h2a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" /><circle cx="10" cy="12.5" r="3.2" /></>],
  check: [20, <path d="m5 10.5 3.2 3.2L15.5 6" />],
  hint: [20, <><path d="M7.5 15.5h5M8 18h4" /><path d="M6.2 11.8a6 6 0 1 1 7.6 0c-1.2.8-1.3 1.7-1.3 2.2h-5c0-.5-.1-1.4-1.3-2.2Z" /></>],
  lightbulb: [20, <><path d="M7.5 14h5M8 17h4" /><path d="M6.4 10.8a5.5 5.5 0 1 1 7.2 0c-1 .7-1.1 1.5-1.1 2.2h-5c0-.7-.1-1.5-1.1-2.2Z" /></>],
  pencil: [20, <><path d="m4 15 1-4L14.5 1.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 14l-4 1Z" /><path d="m13 3 3 3M5 11l3 3" /></>],
  search: [20, <><circle cx="8.5" cy="8.5" r="6.2" /><path d="m13 13 5 5" /></>],
  type: [20, <><path d="M5 4h10M10 4v12M7 16h6" /><path d="m3 7 2-3 2 3M13 7l2-3 2 3" /></>],
  upload: [20, <><path d="M10 13V3m0 0L6 7m4-4 4 4" /><path d="M4 11v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" /></>],

  // Utility set (24×24)
  arrow: [24, <path d="M5 12h14m-6-6 6 6-6 6" />],
  reset: [24, <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />],
  chevron: [24, <path d="m9 5 7 7-7 7" />],
  rotate: [24, <><path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></>],
  trash: [24, <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>],
  alert: [24, <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>],
  info: [24, <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.01" /></>],
  close: [24, <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>]
};

export default function Icon({ name, size, className = "" }) {
  const [grid, body] = icons[name] || icons.info;
  return (
    <svg
      className={`icon ${className}`}
      viewBox={`0 0 ${grid} ${grid}`}
      strokeWidth={grid === 20 ? 1.7 : 2}
      {...(size ? { width: size, height: size, style: { width: size, height: size } } : {})}
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}
