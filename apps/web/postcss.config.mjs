// Tailwind is used only by the adopted primitives in packages/ui; the application's own surfaces are
// CSS modules over the tokens in globals.css. Preflight is deliberately not imported (see globals.css)
// so the utility layer cannot re-style application markup.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
