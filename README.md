# Nolan

Nolan's personal organizer, set inside a living 3D universe. Today it covers the 2026/27 year at UC3M (Double Degree in Computer Engineering and Business Administration).

**Live site:** <https://relentlessyunn.github.io/with-nolan/>
**Made of:** plain HTML, CSS and JavaScript — no libraries, no build step — published on GitHub Pages.

> **For Claude:** read this whole file before touching anything.
> 1. Clone the repo (`git clone https://github.com/RelentlessYunn/with-nolan`) to work on the latest published version.
> 2. Change only the files you need.
> 3. Bump the version (see [Publishing a version](#publishing-a-version)).
> 4. Run the tests. They run without the PIN: never ask for it, type it or try to guess it (see [Tests](#tests)).
> 5. Answer the owner in Spanish.

---

## Contents

1. [What the site has](#what-the-site-has)
2. [Changing the calendar (quick guide)](#changing-the-calendar-quick-guide)
3. [Adding data](#adding-data)
4. [How the code is organized](#how-the-code-is-organized)
5. [PIN and guest mode](#pin-and-guest-mode)
6. [Saving: the cloud and offline](#saving-the-cloud-and-offline)
7. [The universe](#the-universe)
8. [Home and the interface](#home-and-the-interface)
9. [Extending the site](#extending-the-site)
10. [Publishing a version](#publishing-a-version)
11. [Tests](#tests)
12. [Credits](#credits) · [Roadmap](#roadmap)

---

## What the site has

| Part | What it does |
|---|---|
| **Entry screen** | Nolan's logo (opens the PIN keypad) and a **Guest** button that opens a demo. See [PIN and guest mode](#pin-and-guest-mode). |
| **Home** (`#home`) | Where the app starts: the time, a greeting and the weather where you are. Further down, the sections **UC3M** and **Nolan**, and **Start the journey** through the sights of the universe. |
| **Sights** (`#earth`, `#moon`, `#blackhole`, `#whirlpool`, `#ringgalaxy`, `#edgeon`, `#orion`, `#pleiades`, `#ring`, `#binary`, `#antennae`) | The camera flies to each one and frames it, with its name, a few words and a dock to go to the others. |
| **Schedule** (`#schedule`) | *Today* (the day's classes, the red "now" line, "X min left"), the next 7 days, and the weekly timetable. Tap a class to see all its dates in a small pop-up. |
| **Month** (`#planner`) | The whole year's monthly planner. **+ Add** (or tap a day) adds an event of your own. |
| **Subjects** (`#subjects`) | One card per subject: timetable, faculty, grading with a grade calculator, dates and syllabus progress. |
| **Exams** (`#exams`) | Everything graded, with filters. **Add to my calendar** downloads an `.ics` file for the phone's calendar. |
| **Tasks** (`#tasks`) | Tasks per subject and general ones, saved to the cloud. |
| **Faculty** (`#faculty`) | Email and office of each teacher. |
| **Nolan** (`#nolan`) | Nolan's own section: **Día**, **Semana** and **Mes** windows with UC3M classes, his weekly routine, his plans and his own events. |
| **Notes for Claude** (`#notes`) | Free text saved to the cloud. Claude cannot read the cloud: press *Copy notes* and paste them into the chat. |
| **Settings** (`#settings`) | Language, smooth scrolling, **Effects** (High / Medium / Minimal) and Log out. |

On a phone the tabs sit at the bottom and you can swipe between them. Old Spanish links (`#horario`, `#asignaturas`, `#notas`…) still work.

**Details worth knowing**

- **Exams → Add to my calendar** (`js/ics.js`) writes `nolan-uc3m.ics`: Madrid time, reminders the day before and an hour before, multi-day windows as all-day events, and stable IDs, so importing again updates instead of duplicating. Dates without a day are left out until `data.js` has them.
- **Settings → Effects** sets animations and quality together (`LOOKS` in `prefs.js`). Changing a setting reloads the page behind a soft fade (`js/shift.js`). **Smooth scrolling** (`js/smooth.js`, off by default) only changes the mouse wheel. There is only the dark look.

---

## Changing the calendar (quick guide)

Everything the calendars show comes from **`data.js`** (for a guest: `demo.js`). **Change the data, never the code**: every view redraws from it by itself. Then bump the version.

| To… | Edit | Example |
|---|---|---|
| add or move an exam, a submission, a one-off class | `EVENTS` | `{subject:"is", date:"2026-10-08", what:"Examen parcial I", weight:"15 %", type:"ex", time:"10:45–12:15", room:"Aula 2.3.D01"}` |
| mark a date whose day is not known yet | that week's Saturday + `noDay:1` | `{…, date:"2026-12-05", noDay:1, label:"por confirmar"}` |
| something open several days | add `until` | `{…, date:"2026-10-26", until:"2026-10-31"}` |
| say what an exam covers | add `syllabus` | `syllabus:"Hasta teoría de juegos"` |
| a weekly class, or one on loose dates | `CLASSES` | see [A class](#a-class) |
| something every week in Nolan's day and week | `ROUTINE` (`day` 0 = Monday … 6 = Sunday) | `{day:1, start:"19:00", end:"20:30", what:"Gimnasio", place:"Polideportivo", color:"#3FD9A4"}` |
| a personal plan (Nolan's calendar only) | `PERSONAL` | `{date:"2026-10-12", what:"Cena", time:"21:00", place:"Casa", color:"#FFA640"}` |
| a holiday, an exam period, a break | `CALENDAR.holidays` / `CALENDAR.periods` | `{date:"2026-10-12"}` · `{from:"…", to:"…", type:"exams", label:"…"}` |
| a mark on a day | `CALENDAR.marks` | `{date:"2027-01-26", label:"Empiezan las clases"}` |
| grading, weights, syllabus per week | `eval.js` (`GRADING.<subject>`) | `parts`, `rules`, `syllabus` |
| the advice of a week | `ADVICE[term][week]` | plain sentences |

**Rules:**

- Dates are always `"YYYY-MM-DD"`.
- `subject` must be a key of `SUBJECTS`.
- Times are text with an en dash: `"09:00–10:30"`.
- `js/validate.js` checks the data when the page loads and shows a red warning naming any bad line. Opening the page once tells you if it is right.

Events added with **+** in the app are not in `data.js`: they live in the cloud and need no code change.

---

## Adding data

### A graded date

`data.js`, list `EVENTS`:

```js
{subject:"ed", date:"2026-11-13", what:"Segundo parcial: bloque 2", weight:"25 %", type:"ex",
 time:"09:00–10:30", room:"Aula 2.2.C04", format:"Presencial y escrito", syllabus:"Temas 5 y 6"}
```

| Field | Meaning |
|---|---|
| `type` | `ex` exam · `en` submission · `cl` class or lab · `cf` clash |
| `noDay:1` | the day is unknown: use that week's Saturday; it shows as "semana N" (custom text in `label`) |
| `until` | last day, when it lasts several days; the planner joins the days with a line |
| `online:1` | online, so there is no "no class that day" warning |

The week and the date label are computed. It shows up by itself in the subject card, *Today*, the planner, *Exams* and the week.

### A class

`data.js`, list `CLASSES`:

```js
{subject:"ec", day:3, start:840, end:930, kind:"laboratorio", room:"INF 7.0.J04", when:"24 sep · 22 oct", group:"82",
 dates:["2026-09-24","2026-10-22"]}
```

- `day`: 0 = Monday … 4 = Friday. `start`/`end`: minutes since midnight (840 = 14:00).
- A weekly class has `from`/`to`; a class on loose dates has `dates` (and optional `rooms`, one per date).
- Half width, hatching and clashes are computed.

### A personal plan

`data.js`, list `PERSONAL` (Nolan's calendar only):

```js
{date:"2026-10-12", what:"Cena con la familia", time:"21:00", place:"Casa", color:"#FFA640"},
```

Only `date` and `what` are required; `until`, `time`, `place`, `note` and `color` are optional.

### Your own events (from the app)

Nothing to edit. Each calendar has **+ Add** (or tap an empty spot of a day) with a small form. Events can be changed or deleted from their detail (deleting asks for a second tap). They live in `MyEvents` (`planner.js`):

| Who | Where they are kept |
|---|---|
| Nolan | the cloud, record key `eventos`, saved one change per event (two devices never undo each other; offline they wait on the device) |
| without a cloud key | the device (`localStorage`, `nolan-my-events`) |
| a guest | this visit only (`sessionStorage`, `nolan-guest-events`) |

The UC3M calendar shows the ones added there (`where:"uc3m"`); Nolan's shows them all.

### Tasks and advice

- **A task** → `TASKS.<subject>` or `GENERAL_TASKS`: `["Title","Detail"]`. Ticks are tied to the title, so tasks can be reordered or removed freely.
- **Advice for a week** → `ADVICE[term][week]`. That week's dates are added on top automatically.

### Term 2

1. New entries in `SUBJECTS` with `term:2`.
2. Their classes in `CLASSES`, grading in `GRADING`, faculty in `FACULTY`.
3. Optionally, advice in `ADVICE[2]`.

From 26 January the site switches to those subjects by itself. Until they exist, term 1 keeps showing.

---

## How the code is organized

Each file does one thing; to change something you usually need one or two.

### Data

| File | Contains |
|---|---|
| `data.js` | `SUBJECTS`, `CLASSES`, `FACULTY`, `EVENTS`, `TERMS`, `CALENDAR`, `ADVICE`, `TASKS`, `GENERAL_TASKS`, Nolan's `ROUTINE` and `PERSONAL`. |
| `eval.js` | Grading and syllabus of each subject (`GRADING`). |
| `demo.js` | The guest's invented organizer (loaded instead of `data.js`, `eval.js` and `config.js`). |
| `config.js` | The JSONBin key for the cloud. Without it the site works but does not save. |
| `js/galaxies.js` | What each galaxy is made of (`GALAXIES`, `COMPANIONS`). Data only. |

### Code (`js/`), in load order

| File | What it does |
|---|---|
| `prefs.js` | Settings (`SETTINGS`, `saveSetting`) and `lowMotion()` / `fullMotion()` / `highQuality()` / `fancy()`. |
| `i18n.js` | Spanish and English texts (`t`, `tn`) and date formatting. |
| `core.js` | Shared helpers: dates, weeks, the term in force, `classesOn`, `eventLabel`, `whenLabel`, the detail panel, the error banner. |
| `shift.js` | The soft fade when a setting reloads the page. |
| `gate.js` | The entry screen, guest mode (`Gate.guest()`), Log out (`Gate.lock()`), `Gate.onOpen`. |
| `wonders.js` | The universe's wonders: nebulae, the Pleiades, the binary, the Antennae, supernovae, the Earth and the Moon. |
| `shaders.js` | The graphics card programs (GLSL text, `UNIVERSE_SHADERS`). Text only. |
| `galaxies.js` | See *Data*. |
| `universe.js` | The 3D engine (WebGL2): galaxies, far sky, comets, camera flights, sights (`PLACES`, `sightView()`). |
| `sky.js` | The CSS sky without WebGL2, and the sky of stars of Effects = Medium (`window.Stars`). |
| `validate.js` | Checks `data.js` and `eval.js` before rendering; bad lines are left out and reported. |
| `derived.js` | Computed data: class clashes, the timetable grid layout. |
| `cloud.js` | Saving to JSONBin (see [The cloud](#the-cloud)). |
| `header.js` | Clock, date, week, the compact header. The only clock: it emits `minute` and `newDay`. |
| `astro.js` | The real sky, offline: sunrise and sunset, the Moon, meteor showers. |
| `weather.js` | Weather and sun on home. |
| `schedule.js` | The weekly timetable and the clash bar. |
| `today.js` | *Today* (the red line is moved in place each minute). |
| `subjects.js` | Subject cards and the grade calculator. |
| `ics.js` | "Add to my calendar" (RFC 5545). |
| `faculty.js` · `exams.js` · `tasks.js` · `notes.js` · `settings.js` | One tab or page each. |
| `planner.js` | `makePlanner(box, {events, personal, mine, where})` and `MyEvents`. The Month tab and Nolan's month are two planners. |
| `nolan.js` | The Nolan section: header and the Día / Semana / Mes windows. |
| `home.js` | Home: the hero, the section cards, the journey (`SIGHTS`, the dock), each sight's page. |
| `router.js` | Routes, tabs, swipe, Escape (back), guest restrictions, first view (`data-booting`). |
| `view.js` | "Just the sky": hides the interface. |
| `debug.js` | The `#debug` panel: screen sizes, data warnings, missing translations. |
| `smooth.js` | Smooth mouse-wheel scrolling. |
| `effects.js` | Ripple and stardust on tap, star bursts on ticks, warp between tabs, idle pause. |
| `sw.js` (root) | The service worker for offline use. |

### Design (`css/`)

`base` · `sky` · `header` · `tabbar` · `today` · `schedule` · `planner` · `subjects` · `exams` · `tasks` · `home` · `nolan` · `settings` · `effects` · `astral` · `cinema`. Each ends with its own mobile tweaks.

- **Colours** are tokens on `:root` in `base.css` (`--space`, `--paper`, `--card`, `--card-solid`, `--ink`, `--ink-2`, `--rule`, `--go`, `--warn`…). `--card` is see-through glass; use `--card-solid` where nothing may show through.
- **Marks on `<html>`**, set before painting by the `<head>` script of `index.html`:
  - `data-locked`: the entry screen is up.
  - `data-guest`: a guest.
  - `data-booting`: nothing shows until `router.js` picks the first view (after 3 s it shows anyway).
  - `data-motion="full|basic|none"`: the animations setting.
  - `gl` / `nogl`: added by `universe.js`.

### Code rules

- **No libraries, no build.** Each file in `js/` is a plain script; top-level `const` and `function` are visible to the files after it.
- **An error in one file does not take the others down.** A red banner shows the file and the message.
- **Events** (`document.addEventListener`): `minute`, `newDay` (`detail` = the date), `tab` (`detail` = its name), `cloud` (`detail` = `{kind, text}`).
- **Dates** are `"YYYY-MM-DD"` strings; use `fromISO` (noon, safe from daylight saving) and `addDays`.
- **Update in place** what changes every minute, only where something changed: rebuilding restarts animations and flickers.
- **Motion checks:** `fullMotion()` for decorations that move, `lowMotion()` for any motion, `highQuality()` for heavy visuals, `fancy()` for both.
- **Style:** English, comments that explain *why*, nothing written by hand that can be computed from the data.

### Languages

- **Code** is in English. **Data** (`data.js`, `eval.js`) stays in Spanish, as copied from UC3M; its keys are English.
- **The interface** is English (default) or Spanish (`js/i18n.js`). Every visible text goes through `t("key", {vars})`:
  - Add each new text to **both** `STRINGS.es` and `STRINGS.en`.
  - A plural is `{one, other}`, chosen by `vars.n` (or `tn(key, n)`).
  - A guest version of a text is `key@guest`.
  - Static HTML uses `data-i18n`, `data-i18n-html`, `data-i18n-aria`, `data-i18n-title`, `data-i18n-placeholder`, with the Spanish text also written in the HTML.
  - Dates: `fmtLong`, `fmtShort`, `fmtDayShort`, `fmtDayMonth`, `fmtRange`, `fmtMonthYear`, `dayName`, `termOrdinal`.
- A missing translation falls back to Spanish and is listed in `#debug`. The tests fail if any key is missing.

---

## PIN and guest mode

The site opens behind an entry screen (`js/gate.js`, styles in `css/cinema.css`): Nolan's logo and a **Guest** button.

### The PIN

- **The logo opens the keypad** (typing a digit does too). The logo again, or Escape, closes it.
- The PIN is **not** in the code: only its PBKDF2-SHA256 hash (150 000 rounds, fixed salt), in `js/gate.js` and in the `<head>` script of `index.html`.
- A device that types the right PIN keeps the hash in `localStorage` (`nolan-device`) and is not asked again.
- **Nothing of yours is read before the PIN**: the cloud and the location are asked for only once the gate opens (`Gate.onOpen`).
- **Log out** (Settings, red button) forgets the device and returns to the entry screen (`Gate.lock()`).
- **To change the PIN**: compute the new hash and put it in both places, and in `DEVICE` in `tests/run.js`. Every device will ask again.
  ```
  node -e 'console.log(require("crypto").pbkdf2Sync("NEWPIN","nolan·with-nolan·2026",150000,32,"sha256").toString("hex"))'
  ```

> **Limits:** the PIN keeps people out of the page, but the repository is public: anyone can read `data.js` on GitHub. A six-digit PIN can also be brute-forced from its hash. Real protection would need private hosting with a login in front (for example Cloudflare Access).

### Guest mode

For showing the site (a portfolio). **Guest** (`#gateGuest`, or a `?guest` link) opens the same site with a **demo organizer**: an invented Computer Science term at an invented university, always placed around today (today is always week 4 of 14).

- `index.html` loads `demo.js` **instead of** `data.js`, `eval.js` and `config.js`. Nothing of Nolan's is loaded, nothing touches the cloud, the location is never asked (the weather is Getafe's, not saved).
- Not for a guest: Notes for Claude, the Nolan section and Aula Global (the router sends them home).
- It lasts the visit (`sessionStorage` `nolan-guest`; `<html data-guest>`). In code: `Gate.guest()`.
- **Leaving:** Settings → "Leave guest mode", or close the tab.

---

## Saving: the cloud and offline

### The cloud

`cloud.js` saves to JSONBin: task ticks (`hechas`), exam grades (`grades`), notes for Claude (`notas`) and your own events (`eventos`). The record keys stay in Spanish on purpose: renaming them would lose saved data.

- Read **only after the PIN**, never for a guest.
- **This device's last copy shows at once** while the fresh one is read; the fresh read only changes what changed. Listeners get `(rec, {copy:true})` for that copy (`Cloud.onLoad`). Notes can be typed in only once the fresh read arrives.
- Nothing is written until the first read succeeds. It retries by itself; changes wait in a queue.
- It saves **by changes** ("this task done") on top of a fresh read, so it never overwrites what you did not touch.
- Pending changes are flushed when the app is hidden or closed; it reads again when you come back after a while.
- Settings are not in the cloud: they are per device (`localStorage`, key `settings`).

### Offline

The site works without a connection (`sw.js`, registered when served over the web) and can be installed to the home screen (`manifest.webmanifest`).

- **The page** comes from the network first (`cache:"no-cache"`), so a new version shows as soon as there is signal; without signal, from the device's copy.
- **Its files** carry the version in their address (`?v=…`), so the kept copy is always right.
- **What to keep is read from `index.html` itself** (every `href` and `src`, plus the manifest's icons). Each new version drops the old files. Nothing to list by hand.
- **Your data:** the last cloud copy shows offline; changes made offline go up when the connection is back, even after closing the app.
- The weather keeps its last reading; sunrise and sunset are computed offline.

---

## The universe

The whole app lives in one real 3D universe drawn by the graphics card (WebGL2) on a canvas behind everything (`js/universe.js`, with `shaders.js`, `galaxies.js` and `wonders.js`).

### How much runs: Effects

| Effects | Animations · Quality | What you get |
|---|---|---|
| **High** | All · High | the living 3D universe |
| **Medium** | All · Medium | a sky of stars you can fly through (`window.Stars`, no 3D) |
| **Minimal** | None · Low | a plain dark background, nothing moves |

The two settings still exist underneath (`SETTINGS.motion`, `SETTINGS.quality`) and every pair is handled:

| | Quality High | Quality Medium | Quality Low |
|---|---|---|---|
| **Animations All** | everything | glass and glows over a still sky of simple stars | plain background; ripple and bursts only |
| **Animations Basic** | the sky stands still; no flights (the camera jumps) | the same, still | plain and still |
| **Animations None** | nothing moves | nothing moves | everything off |

Without WebGL2, `js/sky.js` and `css/sky.css` draw a simpler CSS sky.

### Places and flights

- **Home is the Nolan galaxy** (the blue spiral high on the right). **Each section is a galaxy you can see from home**: UC3M (the golden barred spiral low on the left) and Nolan (the amber elliptical high on the left).
- **The opening:** after the PIN (or Guest), or on the first visit of a session, the camera flies from behind the Earth into home (about 5.5 s). A **Skip intro** button at the foot of the screen ends it at once (`Universe.land()`); it fades in and out with the opening.
- **Opening a section** flies into its galaxy (`Home.enter(id, go)` → `Universe.go(id)`), and the section appears inside it. A **second click** (or Enter / Space) during the trip shows the section at once while the camera finishes (`Universe.skip()`). Going home flies back out.
- **Flight times** follow the distance (`flightTime`: 2.2 s plus a little per unit, at most 6.5 s), eased softly at both ends (a quintic).
- **Flights go round worlds** (`wayOf`): if the straight line passes within 2.6 radii of the Earth or the Moon, the flight bows out along one smooth curve (a cubic Bézier, travelled at even speed).
- **The slow turn:** at rest, the camera floats and slowly turns around what it looks at, so near things move against far ones and the depth shows. At a sight it swings wider (about ±17° and ±7°). The turn fades out during flights (1.5 s) and back in on arrival (6 s), eased, so the speed never jumps. With a mouse the view leans a little towards the pointer.
- **Effects = Medium** has no 3D: each place is a still picture of stars; opening a section moves forward into that section's bright star (about a second).

### The sights

Eleven places the camera flies to and frames whole: the **Earth**, the **Moon**, the **black hole**, the **Whirlpool** (home's galaxy), the **ring galaxy**, the **edge-on galaxy**, the **Orion Nebula**, the **Pleiades**, the **Ring Nebula**, the **vampire star** and the **Antennae**.

- `PLACES` (`universe.js`) holds where each is (`p`), how big (`R`), a closer or wider look (`k`) and, for a galaxy, `turn`. `layout()` fills it from the black hole, `SIGHT_GALAXIES` and the `sights` each wonder declares.
- `sightView()` frames a sight so its radius fills a share of the screen's shorter side (40% on a phone, 29% on a computer, 22% on a phone on its side; times `k`), a little above the middle so its words fit below.
- `Universe.sights()` lists them; `Universe.place(id)` says where one is on screen (tests).

### Galaxies

Every galaxy has its own shape in `GALAXIES` (`js/galaxies.js`), after real ones:

| Galaxy | Looks like |
|---|---|
| **Nolan (home)** | a blue grand-design spiral nearly face-on, like the Whirlpool (M51), with its small companion. Its arms are a logarithmic spiral (`logS`, a steady pitch of about 20°). Also the sight `#whirlpool`. |
| **UC3M** | a golden barred spiral, like NGC 1300. |
| **Nolan section** (`forge`) | an amber elliptical, high on the left. |
| **Ring galaxy** (`ringgalaxy`) | like Hoag's Object: a yellow core, a dark gap and a knotty ring of young blue stars, with two companions. |
| **Edge-on** (`edgeon`) | like the Sombrero (M104): a big bulge cut by a dark ring of dust. |

How they are made:

- **Density waves** (Lin & Shu, as in Ingo Berg's *Galaxy Renderer*): each star moves on an ellipse, each a little flatter and more turned further out. The arms are where the ellipses crowd, so they stay while stars flow through, and the pattern itself turns slowly.
- **Pink star-forming regions** light up only while crossing an arm; young blue stars live in the arms.
- **Resolved stars** are mostly faint grain with a few bright giants, each at its own height, so they drift against the disk when the camera turns.
- **Bulges** are swarms of stars on orbits in every direction; **globular clusters** circle each galaxy.
- **Each disk is a real volume**: its light and dust are painted once into a map, then every ray walks through the disk front to back. Old stars fill a thick flaring layer, young stars a thin one, and dust forms 3D clouds that darken what lies behind them. Every galaxy sits in a faint round stellar halo.
- **No drawn edges**: stars thin out smoothly towards the rim and the halo fades to nothing before its sphere ends.
- **The edge-on galaxy on a phone** is a picture: its light and dust were rendered once at a computer's best quality (`img/edgeon-light.jpg`, `img/edgeon-dust.jpg`) and a phone draws them as a card facing the camera (`CARD_FS`, `drawCard`), with 3D stars on top. To remake them after changing that galaxy, render it at the sight on a computer, read the volume pass and save light as √(c/(1+c)) and dust as 0..1 (`EDGE_CARD` keeps the card's size and camera). A page opened as a file cannot use pictures, so there it is the volume, as on a computer.
- `Universe.view(id)` says where a galaxy sits on screen (tests).

### The black hole

`SIGHTS.bh` in `universe.js`, in home's sky and the sight `#blackhole`. It is **ray-traced** in the last step of each frame: each pixel's ray is followed backwards through the curved space around the hole (Schwarzschild; the step of Riccardo Antonelli's *Starless*: a = −1.5·h²·p/|p|⁵).

- The shadow, the photon ring, the disk bent over and under the hole and the Einstein ring of what lies behind all come out of that.
- The gas glows like a black body, bluer on the side coming at us (Doppler), redder deep in the pull (gravitational redshift); its clumps turn faster inside than outside.
- **From afar** (under 6 px wide) it is drawn as a small picture among the galaxies instead (`HOLE_FS`, `drawHoleFar`), so it never pops.
- **Behind the Earth and the Moon** it is not traced: they report where they stand (`api.occlude`, `uOcc`).

### The wonders

`js/wonders.js`. Each is drawn from a formula on a square that faces the camera, built in **layers at different depths** that slide against each other as the camera moves (`uPar`, `parallax()`). Each fades in (`api.appear`) once its program is ready. At its sight, each lives (Animations = All):

| Wonder | What it is and how it moves |
|---|---|
| **Orion Nebula** | pink hydrogen lit by the four Trapezium stars, with dust filaments; its gas churns in three sheets at different depths, its heart breathing. |
| **Pleiades** | nine blue-white stars at their real places with spikes, sixty fainter members, and blue reflection haze. The cluster is a 3D ball that turns once in about 80 s and rocks, each faint star on its own orbit; the bright ones twinkle in brightness and colour; the haze streams past with waves of light. |
| **Ring Nebula** | a 3D barrel of gas seen nearly down its axis: teal inside, then green-yellow, orange and a red rim, a white dwarf in the middle. The barrel spins and its axis wobbles; fine filaments stream outwards; ripples of the star's wind run through it; dark comet-shaped knots turn with it. It hides what lies behind it, so the sky's band does not cross it. |
| **Vampire star** (`binary`) | a red giant pulled into a point towards a white dwarf, its gas streaming onto a disk; they orbit in 70 s and hide each other. |
| **Antennae** | two colliding galaxies with merging cores, pink knots of new stars and two long tidal tails. The pair turns and rocks in 3D, the cores circle each other, the arms turn, clumps of stars stream out along the tails, and each knot of new stars flares and dims on its own beat. |

**Now and then, a supernova** (every 3–9 minutes, Animations = All): a far star flares blue-white. Its **blast wave** comes straight at us at a steady speed, so — like a real explosion seen from afar — it creeps out of the star for about 20 s, then in its last second rushes over the whole sky (`waveAt()`: a sphere of radius x at distance 1 looks x/√(1−x²) wide). It leaves the screen at its farthest corner the moment it reaches us (24 s): a white flash, and the sky shakes (not with animations turned down). Then the star fades through yellow and red and leaves a small ragged shell. `Wonders.nova(x, y, age)` sets one off (tests).

### The Earth and the Moon

Both sit far behind home: the opening starts beside them, and the sights `#earth` and `#moon` fly back there. They are **traced per pixel as real spheres** (`ball()`), so they keep their shape up close; a real picture that arrives fades in over the procedural one.

- **The Earth:** NASA's Blue Marble colours, night lights, seas and heights (`img/`). Clouds drift in the real climate belts (painted once round the globe, `api.bake`), mountains catch the low sun, the Sun glints on the sea, city lights on the night side, auroras over the poles and thin blue air at the edge.
- **The Moon:** the LRO map (`img/moon.jpg`; `img/moon-4k.jpg` on a computer), hanging **as it does in tonight's sky over Getafe** (`Astro.moonSky`): its real phase, its bright limb towards the real Sun and its disc turned as it stands in the sky. It reflects light like the real Moon (Lommel–Seeliger), with earthshine on its dark side.

### The sky around

- **The far sky:** thousands of fixed stars (a few twinkle), a faint nebula, dozens of tiny far galaxies, and stars that stretch into streaks while the camera flies.
- **The band of our galaxy** (`BANDGEN_FS`): like the Milky Way on a dark night, with star clouds, dust lanes and pink knots; a low arch on a computer, a diagonal on a phone (`bandShape()`).
- **Shooting stars** every few seconds, and **comets** of six kinds after real ones (`COMET_KINDS`), crossing the screen nearly level, never two of a kind at once. They live in space, so flights move past them.
- **Meteor showers on their real dates** (`Astro.shower`, after the IMO calendar): more shooting stars, radiating from the shower's radiant.
- **Like a camera:** high dynamic range developed with a soft curve, bloom, a vignette and a fine dither.

### Performance

- **Nothing is recalculated on the processor each frame.** Every moving thing is an exact formula of time on the graphics card; each frame only passes the time and the camera.
- **Galaxies are built once**, one at a time (home's first), in small steps: stars in a background worker, maps painted in strips of about 512×512 px.
- **One loop draws everything**, only while something needs it (`loop()` / `oneFrame()`; `need()` asks for one more frame).
- **Budget:** phones draw about a third of the stars at about 30 fps; computers at about 60. Volumes are drawn at half resolution (stars stay sharp). The render size adapts if the device cannot keep up. `?tier=phone` / `?tier=desk` forces one.
- **While scrolling** the sky keeps moving at a lower rate (about 30 fps on a computer, 22 on a phone). It pauses when the tab is hidden and after 2 minutes idle.
- **Phone fixes:** half-float pictures are blended by hand (`UP_FS`, `bloomAt`), since some phones never blend them (stairs of squares); stars are capped and dust is never fully opaque, so no NaN black dots; dust grids are 8-bit (`R8`).
- **Sharp stars at any zoom:** a wonder's small stars use `psf()` / `starField()` (in `COMMON`): a core about one screen pixel wide (from `pixelQ()`, the size of a pixel in the wonder's units), a faint glow and a halo only for bright ones, real star colours (`starTint`) and a steep luminosity function. Stars sized in the wonder's own units grew into soft grey blobs as the camera came close.
- **Seamless angular noise:** noise along an angle from `atan` must use `fbmA()`, not `fbm(vec2(angle*k, y))`: `atan` jumps from π to −π and plain noise shows that jump as a straight line out of the centre.
- Test hooks: `Universe.seek(seconds)` jumps time, `Universe.shoot()` sends a shooting star and a comet.

---

## Home and the interface

### Home

Home (`#home`, `js/home.js`, `css/home.css`) is a window over everything; the page behind cannot be clicked or tabbed into.

- **First screen:** the hero alone (logo, NOLAN, the time, the greeting, the weather). A small arrow (`#homeMore`) scrolls to the rest.
- **Further down:** the section cards (UC3M with the week, the class now and the next assessment; Nolan) and **Start the journey** (`#tourStart`), which flies to the Earth and starts the tour.
- **A sight's page** (`#<id>`): the words sit low over a soft shade, so the sight fills the sky above: a line on what it is, its name, a few words and "Destination n of 11".
- **The tour's dock** (`#tour`, from `SIGHTS`): every place with its icon and colour; arrows (and ← →) to the previous and next; the logo goes home.
- **Back and Escape walk back the way you came** (`router.js`, `Home.visit`). Escape first closes an open detail panel.
- **Top right:** just the sky, Notes and Settings. Notes and Settings open where you are, without moving the camera.
- **The logo is the home button.** The N draws itself when the app starts and after the PIN.
- In code: `Home.enter(id, go)`, `Home.isSight(id)`, `Home.sights()`, `Home.back()`.

### The astral interface

- **Glass** (`css/astral.css`): cards, tab bar and buttons are dark translucent glass with starlight borders; section titles end in a four-point star.
- **Effects** (`js/effects.js`): soft points of light where you tap, sparks when a task is ticked.
- **Just the sky** (`js/view.js`): the eye button hides the interface; the logo or Escape brings it back.
- **The weather** (`js/weather.js`): now, high and low, rain and the next sunrise or sunset, from Open-Meteo and BigDataCloud (free, no keys), kept 20 minutes.
  - Where the device is (asked once, after the PIN), or Getafe.
  - Only the newest answer may change the card; the card keeps its size while it waits.
  - Offline it retries every 20 minutes and at once when the connection is back.
- **Your constellation** (Tasks): one star per task, lit and joined when done. A tick pops and a star is born only when *you* tick, never for ticks arriving from the cloud.
- **The red "now" line** ends in a glowing point and moves in place each minute.

### Name and logo

The site is called **Nolan**. The logo is an astral N: four four-point stars joined by straight lines, green → blue. `favicon.svg` is the source; `favicon.ico`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` are rendered from it.

---

## Extending the site

### A new section

1. Its galaxy in `GALAXIES` (`js/galaxies.js`): shape, size, colours, where it sits seen from home (`at.d` computer, `at.m` phone), and `star` (its colour in the sky of stars).
2. A card on home (`index.html`, inside `.p-cards`) with `data-scene="<id>"`, and its texts in both languages.
3. Its page: a route in `router.js` (`isHome` if it opens inside home) and its view (`home.js`, `sceneOf`).
4. Keep guests out if it shows any data (`router.js` sends a guest home from everything except home, Settings and the sights).
5. A test in `tests/run.js` that opening it flies into its galaxy, and update the galaxy list in the Astral test.

### A new sight

1. Where it is and how big:
   - a `skyWonder`: give it `sight:"<id>"` and `vis` (how much of its square it fills);
   - a wonder with its own code: `sights:[{id, p, R, k}]`;
   - a galaxy: an entry in `SIGHT_GALAXIES` (`universe.js`).

   `layout()` and `sightView()` do the rest.
2. Its words in both languages: `sight.<id>.name`, `.tag`, `.fact` and `.text`.
3. Its entry in `SIGHTS` (`home.js`), in tour order: `id`, `ac` (colour), `icon` (SVG, viewBox 48×48). The dock, page, route and arrow keys follow.
4. Tests: the sights test covers it by itself; only update the number of sights in the home test (eleven now).

### A new wonder

`js/wonders.js`:

```js
skyWonder("id", {at:{d:[x,y], m:[x,y]}, z, R, rot, blend:"add"|"over", sight, vis, shader, uniforms})
```

- `at`: where it sits seen from home (share of half the screen, computer / phone); `z`: how far; `R`: its radius in space.
- The shader gets `vQ` (−1…1 across the square), `uT` time, `uA` fade, `uS` a seed and `uPar` (parallax), plus `fbm`, `fbmA`, `h12` and, with `N3`, `vn3` / `fbm3`.
- Something that moves through space writes its own `{id, shaders, layout(api), draw(api, phase, t, now), sights}` and pushes it to `window.UNIVERSE_EXTRAS` (see the supernova). Multiply its fade by `api.appear(x)`.
- A shader that fails to compile is left out with a warning. Add the wonder to the list in the wonders test.

### A new setting

Add its values to `SETTINGS_DEFAULTS` and `SETTINGS_OPTIONS` (`prefs.js`), a row in `ROWS` (`settings.js`) and its texts (`s.set.*` in `i18n.js`).

### Nolan

`js/nolan.js` (content) and `css/nolan.css` (design). `#nolan/anything` reaches `Nolan.render(box, "anything")`.

---

## Publishing a version

1. **Never publish two versions under the same number**: the offline copy keeps each file by its `?v=`, so a device would mix old files with the new page.
2. The current version is **0.84**. In `index.html`, bump the footer (`v0.84`; the entry screen copies it) and every `?v=0.84`, all at once. If the logo changes, also bump the icons' `?v=` in `index.html` and `manifest.webmanifest`.
3. Push to `main`. GitHub Pages takes a minute or two; the footer number shows which version you see.

---

## Tests

```
node tests/run.js
```

Needs Node and Playwright. **134 checks** in a real browser (138 with the PIN). They never reach the real cloud or weather: JSONBin, Open-Meteo and BigDataCloud are cut off unless a test puts a fake in front (`config.js` may hold real keys).

**The PIN is not in the tests either.** The checks that type it read it from the environment:

```
NOLAN_PIN=<the PIN> node tests/run.js                  (Git Bash, macOS, Linux)
$env:NOLAN_PIN="<the PIN>"; node tests/run.js          (PowerShell)
```

Without it, three checks are skipped and say so; with it, one more check confirms `NOLAN_PIN` really is the PIN.

What they cover:

| Area | Checks |
|---|---|
| Loading | no errors, nothing wider than a phone, the first view chosen |
| Entry screen | logo and Guest only, nothing read behind it, keypad, wrong PIN, remembered device, the PIN nowhere in the page, Log out |
| Flights and tour | UC3M and back, the second click, Notes inside UC3M, the journey, the dock, arrow keys, Escape, old `#soon/…` links |
| Sights | each framed whole on four screens; the black hole up close and from afar; the Earth and the Moon |
| Guest mode | no private sections, no cloud, Getafe's weather, still a guest after reloading, the way out |
| No flicker | the red line, home's cards, the weather card, ticks from the cloud |
| Calendar | the red line at different times, minute and midnight changes, dates without a day, multi-day windows |
| Cloud | failed or slow first reads, old ticks migrated, the device copy first, grades with a comma |
| Home and settings | the window, just the sky, Nolan, the reload fade, English, every text translated, the animation levels |
| Astral | weather and sun, the galaxies, the Moon's phase, meteor showers, the band, the seven wonders, a supernova, Quality Low and Medium, Effects, the constellation |
| Other | compact header, swipe, idle, offline (opens and keeps a tick made offline) |

**Add a test whenever you fix a bug.**

---

## Credits

- **The Earth** (`img/earth-day.jpg`, `img/earth-aux.jpg`): NASA's Blue Marble and Black Marble, water mask and topography (NASA Earth Observatory / Visible Earth; public domain), as packed by the `three-globe` project; resized and repacked.
- **The Moon** (`img/moon.jpg`, `img/moon-4k.jpg`): NASA / GSFC / Arizona State University, the LRO Wide Angle Camera mosaic and its heights, resized and repacked.

## Roadmap

Ordered by how much it will be noticed.

1. **Final exam rooms.** The dates of the first sitting are in `EVENTS`; the rooms are still "por publicar".
2. **Syllabus of each exam** (`syllabus` in `EVENTS`), shown in the detail panel when present.
3. **Term 2.** The structure is ready; only the data is missing.
4. **More of Nolan** in `nolan.js`.
5. **Term average** from the calculator grades and the ECTS, and what each final needs.
6. **Fixed Madrid time**, even when the phone is in another time zone.
7. **Tests on GitHub**: run `tests/run.js` with GitHub Actions on every push.
