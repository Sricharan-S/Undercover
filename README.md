# Undercover

A mobile-friendly, offline party game of secret words and hidden infiltrators. Built as a Progressive Web App (PWA) so you can install it on your phone (iOS or Android) from a single URL — no app store required.

Pass-and-play on a single device. Civilians, Undercovers, and the elusive Mr. White all share the same screen, taking turns to peek at their secret word and bluff their way to victory.

## Features

- **Two game modes**
  - **Quick Game** — type names fresh, nothing saved. Great for one-off parties.
  - **Tracked Game** — pick from a saved roster, scores accumulate to the leaderboard.
- **Card-pick reveal** — each player taps a face-down card to reveal their role and word. Animated flip, no accidental peeks.
- **663 word pairs** across 12 categories (Food, Animals, Places, Sports, Jobs, Household, Entertainment, Nature, Transport, Body, Clothing, Technology) plus a "Random" option.
- **Persistent roster + leaderboard** — saved to localStorage, survives app close and reinstalls.
- **Add players inline** — when a new friend joins mid-party, add them to the roster from the setup screen.
- **Mr. White last-chance guess** — when ousted, Mr. White can guess the Civilians' word for an instant win.
- **Fully offline** — once loaded, no network needed. Service worker caches everything.
- **Mobile-first UI** — portrait, large tap targets, dark theme, safe-area aware (iPhone notch/home indicator).

## How to play (rules summary)

1. **Setup**: 3-20 players. Choose how many Undercovers (0+) and Mr. Whites (0-2). Civilians fill the rest.
2. **Card pick**: Each player takes turns picking a face-down card. The card shows their role and secret word (Civilians and Undercovers get slightly-different words; Mr. White gets no word).
3. **Describe**: Going around in random order, each player says one word or short phrase about their secret word.
4. **Vote**: Discuss, then vote out the player you think is an infiltrator.
5. **Mr. White's last chance**: If Mr. White is voted out, they get one guess at the Civilians' word — correct = instant win.
6. **Repeat** describe/vote until a team wins.

### Win conditions

- **Civilians win** when all Undercovers and Mr. Whites are eliminated. (+2 pts each)
- **Undercovers win** when infiltrators outnumber the surviving Civilians. (+10 pts per Undercover, +6 if Mr. White still alive)
- **Mr. White wins** by correctly guessing the Civilians' word after being voted out. (+6 pts)

Full rules: <https://www.yanstarstudio.com/undercover-how-to-play>

## Tech stack

- React 18 + TypeScript
- Vite 5 (dev server + build)
- Tailwind CSS
- Zustand (state management with `persist` for the roster)
- Framer Motion (card flip + entry animations)
- vite-plugin-pwa (manifest + service worker)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically <http://localhost:5173>).

To preview a production build:

```bash
npm run build
npm run preview
```

## Install as a mobile app (PWA)

Once the app is hosted somewhere (see Deploy below), open the URL on your phone:

### iOS (Safari)

1. Open the URL in **Safari** (not Chrome — iOS PWAs only work via Safari).
2. Tap the **Share** button (square with up arrow).
3. Tap **Add to Home Screen**.
4. Launch from the new home-screen icon — runs full-screen, offline-capable.

### Android (Chrome / Edge / Brave)

1. Open the URL.
2. Most browsers show an **Install** banner automatically. Tap it.
3. Or open the browser menu → **Install app** / **Add to Home Screen**.
4. Launch from the new home-screen icon.

After install, the app works fully offline — your friends don't need internet to play.

## Deploy to Vercel

Per the project setup, Vercel is the recommended host. The repo includes a `vercel.json` with SPA rewrites and cache headers.

```bash
npm install -g vercel
vercel            # follow prompts, accept defaults
vercel --prod     # deploy production
```

Vercel will give you a URL like `https://undercover.vercel.app`. Share that with friends — they can each visit it on their phones and install it.

It also works on **Netlify** (`netlify deploy --prod`) and **GitHub Pages** without changes.

## Project structure

```
src/
  App.tsx                 # screen router based on game phase
  main.tsx                # React entry
  styles.css              # Tailwind + global styles
  data/words.json         # 663 word pairs across 12 categories
  lib/
    types.ts              # shared TypeScript types
    random.ts             # shuffle, pickRandom, uid
    wordPicker.ts         # category options + word pair selection
    roleAssigner.ts       # role counts, deck building, speaking order
    scoring.ts            # win check + per-player score deltas
  store/
    gameStore.ts          # ephemeral current-game state
    rosterStore.ts        # persistent roster + leaderboard (localStorage)
  screens/                # one per game phase
  components/             # Button, Card, PlayerChip, InstallPrompt
public/
  manifest.webmanifest    # PWA manifest
  icons/                  # 192/512/maskable + apple-touch icon
scripts/
  generate-icons.mjs      # regenerate PWA icons (uses sharp)
```

## Regenerating icons

The default icons are auto-generated from a simple "UC" SVG. To customize:

```bash
node scripts/generate-icons.mjs
```

Edit `scripts/generate-icons.mjs` to change the design, then re-run.

## Out of scope (yet)

- Online multiplayer / private rooms
- Special roles (Lovers, Ghost, etc.)
- True native iOS/Android binaries (PWA covers this need)

## License

Personal project. Game concept and rules © Yanstar Studio.
# Undercover
