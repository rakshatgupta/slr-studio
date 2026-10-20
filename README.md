# SLR / STUDIO

An original, editorial-style SLR(1) parser visualization built with Next.js App Router, TypeScript, and Tailwind CSS. Inspired by the visual principles of thisisdash.com, without copying its branding or assets.

## Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Test

```bash
npm test
npm run build
```

## Design skill

To install the requested third-party Taste Skill in your own coding environment, run:

```bash
npx skills add Leonxlnx/taste-skill
```

The project is self-contained and does not require the skill at runtime. The skill installation was not verified in this offline environment.

## Grammar notation

- One production per line, e.g. `E -> E + T | T`.
- Separate multi-character symbols with spaces, e.g. `F -> id`.
- Epsilon is `ε`.
- Input tokens can be whitespace-separated; compact input uses longest matching terminal.
- Uppercase symbols are treated as nonterminals and must be defined.
- Non-SLR grammars display conflicts; the simulator stops at ambiguous actions rather than guessing.

## Features

Augmented grammar; FIRST/FOLLOW; LR(0) closure and GOTO; canonical states; interactive SVG state graph and inspector; SLR ACTION/GOTO table; conflict detection; deterministic shift-reduce trace; accessible controls; light/dark mode; reduced-motion styling.

## Team

Rakshat Gupta · Anant Garg · Dhairya Sharma
