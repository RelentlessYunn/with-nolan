# Nolan

Nolan's personal organizer. Today it covers the 2026/27 year at UC3M (Double Degree in Computer Engineering and Business Administration).
A static site (HTML, CSS and JavaScript, no libraries, no build step) published on GitHub Pages:
<https://relentlessyunn.github.io/with-nolan/>

> **For Claude:** read this whole file before touching anything. Clone the repo
> (`git clone https://github.com/RelentlessYunn/with-nolan`) to work on the
> latest published version, change only the files you need, bump the version
> (see *Publishing a version*) and run the tests (they run without the PIN:
> never ask for it, type it or try to guess it; see *Tests*). Answer the owner
> in Spanish.

---

## PIN and guest mode

The site opens behind an entry screen (`js/gate.js`, styles in `css/cinema.css`). At first it shows only Nolan's logo and, in the middle, a **Guest** button (*Invitado*).

- **The logo opens the PIN keypad** (`#gateLogo` opens `#gatePad`). Typing a digit on a keyboard opens it too. The logo again, or Escape, closes it and clears what was typed.
- The PIN is **not** in the code: only its PBKDF2-SHA256 hash (150 000 rounds, fixed salt), in `js/gate.js` and in the `<head>` script of `index.html`.
- A device that types the right PIN stores that hash in `localStorage` (`nolan-device`) and is never asked again. Clearing the browser's data, or a private window, asks again.
- **Nothing of yours is read before the PIN**: the cloud is read only once the gate opens (`Gate.onOpen` in `cloud.js`; this device's saved copy of it is shown only then too), and the location is asked only then.
- **Guest** (`#gateGuest`, or a link with `?guest` to share): the same site, working, with a **demo organizer** instead of Nolan's data. It is meant for showing the site (a portfolio): the universe and its sights, and the whole app — timetable, Today, subjects with the grade calculator, exams, tasks, faculty, planner — filled by `demo.js`, an invented term of Computer Science at an invented university, always placed around today (today is always week 4 of 14), so every page has something to show on any day.
  - `index.html` loads `demo.js` **instead of** `data.js`, `eval.js` and `config.js` (a `document.write` in the page chooses): nothing of Nolan's is loaded, nothing is read from the cloud or written to it, the location is never asked (the weather is Getafe's, not saved).
  - Not for a guest: Notes for Claude and the Nolan section (the router sends them home), Aula Global. Texts can have a guest version, `key@guest` in `i18n.js` ("Nolan · Demo", "University", a greeting "…, guest").
  - Coming in reloads the page with the demo, and the camera flies in from the Earth (`sessionStorage` `nolan-fly`). It lasts this visit (`sessionStorage` `nolan-guest`, set by the `<head>` script of `index.html`, which marks `<html data-guest>`). In code: `Gate.guest()`.
- **Leaving guest mode**: Settings, red button ("Leave guest mode"): the page loads again, without the demo, at the entry screen (`Gate.lock()`). Closing the tab ends it too.
- **To change the PIN**: compute the new hash (`node -e 'console.log(require("crypto").pbkdf2Sync("NEWPIN","nolan·with-nolan·2026",150000,32,"sha256").toString("hex"))'`) and replace it in both places, and in `DEVICE` in `tests/run.js`. Every device will ask again.
- **Limits:** this keeps people out of the page, but the repository is public: anyone who opens the code on GitHub can read `data.js` and the rest. Guest mode hides the data in the page, not in the repository. A six-digit PIN can also be brute-forced offline from the hash. Real protection would need private hosting with a login in front (for example Cloudflare Access).

## The universe

The whole app is one universe in real 3D, drawn by the graphics card (WebGL2) on a canvas behind everything (`js/universe.js`).

- **Home is the Nolan galaxy.** After the PIN (or Guest) the camera flies from deep space, from behind the Earth, into home (about five and a half seconds, the far stars fading in around you) and stays there. Home's own galaxy is the blue spiral high on the right of its sky.
- **Each section is a galaxy you can see from home**: UC3M (the golden barred spiral low on the left) and Nolan (his month calendar, the amber elliptical high on the left).
- **The edge-on galaxy on a phone is a picture**: its light and dust were worked out once with the full volume at a computer's best (twice the steps, whole resolution) and saved as `img/edgeon-light.jpg` and `img/edgeon-dust.jpg`; a phone draws them as a card facing the camera (`CARD_FS`, `drawCard`), turned as the disk turns on the screen, and its stars stay 3D. So no phone's graphics card can break it (stairs, sheets). To make the pictures again after changing that galaxy: render it at the sight with a computer, read the volume pass (colour and alpha) and save light as √(c/(1+c)) and dust as 0..1 (`EDGE_CARD` keeps the card's size and the camera it was made from). A page opened as a file cannot use pictures: there it is the volume, as on a computer.
- **Skip intro**: while the opening plays (the flight in after the PIN or on the first visit, `html.flying` / `html.launching`, and the logo drawing itself, `html.intro-on`), a **Skip intro** button at the foot of the screen (above everything, the entry screen included, which stays see-through on top during the flight) ends it all at once: the camera lands (`Universe.land()`) and everything shows. It fades in and out (never just vanishes) when the opening starts and ends.
- **Opening a section** flies the camera into its galaxy (`Home.enter(id, go)` → `Universe.go(id)`), and the section appears inside it: UC3M's timetable has UC3M's galaxy glowing over the header. **A second click** (or Enter / Space) during the trip shows the section at once while the camera flies on to the end, so the sky never jumps (`Universe.skip()`). **Going home** flies back out.
- **Worlds are real balls**: the Earth and the Moon are traced per pixel (each pixel's ray against a sphere, `ball()` in `wonders.js`), so seen up close or off to the side they keep their true shape; right beside the camera they are drawn over the whole screen, never popping. **Flights go round them** (`wayOf` in `universe.js`): when a flight's straight line would pass too near one (2.6 times its radius), the flight bows out instead: one smooth curve from start to end (a cubic Bézier whose two middle points are pushed sideways, just enough to clear every world in the way, travelled at even speed along its length). No corners, no change of direction. A real picture that arrives while one is on screen fades in over the procedural one (1.2 s).
- **A flight takes the time its way needs**: `Universe.go` times it by its length (`flightTime`: 2.2 s plus a little per unit of distance, at most 6.5 s; back to the Earth, far behind home, about five and a half), eased softly at both ends with no rush in the middle (a quintic: its top speed under twice the average), unless it is given a duration (the flight after the PIN: 5.6 s; the opening from the Earth: 4.2 s). The last frame of a flight is always drawn, so the screen never stays on where it came from.
- **The sights**: places the camera flies to and frames whole, one by one: the **Earth**, the **Moon**, the **black hole**, the **Whirlpool** (home's own galaxy), the **ring galaxy**, the **edge-on galaxy**, the **Orion Nebula**, the **Pleiades**, the **Ring Nebula**, the **vampire star** (the red giant feeding a white dwarf) and the **Antennae**. Routes `#earth`, `#moon`, `#blackhole`, `#whirlpool`, `#ringgalaxy`, `#edgeon`, `#orion`, `#pleiades`, `#ring`, `#binary`, `#antennae` (see *Home* for their pages).
  - `PLACES` in `universe.js` says where each one is and how big it looks (`p`, `R` in world units, `k` for a closer or wider look, and `turn` for a galaxy, see below). `layout()` fills it: the black hole with its whole disk, the galaxies of `SIGHT_GALAXIES` (`whirlpool`, `ringgalaxy`, `edgeon`: which galaxy, and how much of it to frame; the edge-on one as wide as its whole disk), and each wonder as big as it is drawn (the `sights` it declares in `wonders.js`).
  - `sightView()` places the camera so the sight's radius fills a set share of the screen's shorter side (40% on a narrow screen, a phone; 29% on a computer; 22% on a short one, a phone on its side; times `k`), with its centre a little above the middle so its words fit below. The camera looks the way home's camera looks, so each sight is seen as it was designed to be seen from home; for a galaxy, part of the way along home's line of sight to it (`turn`).
  - `Universe.sights()` lists their names; `Universe.place(id)` says where one is on the screen and how big it looks (tests).
- **Effects = Medium: a sky of stars you can fly through** (`window.Stars`, in `sky.js`). No 3D: each place is one still picture of stars, painted once. On home each section (and the black hole) is a bright coloured star where its galaxy would be; opening it moves smoothly forward into that star, into the section's own sky, its star shining where it was — one move of about a second, quicker than the 3D flight, with no pull-back and no flare; the two skies cross by adding their light, and a sky drawn smaller than the screen repeats around itself, so the screen is never left without stars. Going home moves back out. `Universe.go` hands its flights to `Stars` when there is no 3D universe. The sights need the 3D universe: without it their list on home is hidden (`html.nogl`), and a sight's address stays in home's sky (only `#blackhole` flies into its own star).
- **Nothing is recalculated frame by frame on the processor.** Every moving thing is an exact formula of time evaluated by the graphics card; each frame the page only passes the time and the camera. Galaxy stars and maps are built once, one galaxy at a time (home's first), in small steps so the page never stutters: the stars are worked out in a background worker, and each disk's map is painted on the graphics card in strips of about 512×512 pixels, one per turn (one big paint used to hold the graphics card for ~40 ms).
- **One loop draws everything**, and only while something needs it (`loop()`, which runs `oneFrame()`). `need()` asks for one more frame; asked while a frame is being drawn (a supernova, a wonder fading in), it is that same loop that asks for the next one. It used to start another loop each time, so two loops ran every frame, then four, then eight.
- **Spiral galaxies follow the density-wave model** (Lin & Shu, as in Ingo Berg's *Galaxy Renderer*): every star moves on an ellipse, each ellipse a little flatter and a little more turned the further out it is. The arms are where the ellipses crowd together, so they stay while the stars flow through them, and inner stars turn faster than outer ones. The whole pattern turns slowly too.
  - **Pink star-forming regions** only light up while they cross an arm (where neighbouring orbits squeeze together) and fade as they leave it; young blue stars and clouds of them live in the arms and fade between them.
  - **Resolved stars**: most are faint grain, a few are bright giants (a steep luminosity function), each at its own height above or below the disk, so they drift against the disk when the camera turns.
  - **Bulges** are swarms of stars on orbits in every direction; **globular clusters** (tight balls of old stars) circle each galaxy on their own tilted orbits; the Whirlpool has its small yellow companion (NGC 5195) and the ring galaxy two small ones (`COMPANIONS`).
- **Each disk is a real volume**, not a picture. Its light (old stars, young stars in clouds, pink regions) and its dust are painted once as a map on the graphics card, from the same orbits (plus patchiness and dust filaments), and the 3D noise for the dust clouds is made once too (only its three small grids of random values go to the graphics card, which blends them itself: a big cube of finished noise, read all over by the rays, was most of the cost of a frame). The page then walks every ray through the disk, front to back: old stars fill a thick layer that flares towards the edge, young stars and pink regions a thin one, and the dust forms clouds with a real 3D shape (made from the noise cube) that rise out of the middle plane and dip into it, brownish at their thin edges. Samples crowd where the ray is nearest the middle plane, where the light and the dust are. The dust darkens what lies behind it, so dust lanes cross the near side of a bulge. Bulges and the elliptical are real 3D glows (brightest at the centre, sampled densely there), and every galaxy sits in a faint round **stellar halo**, so it glows into space instead of looking cut out.
- **The far sky**: thousands of stars fixed on the sky (a few twinkle slowly), a faint nebula painted once, dozens of tiny far galaxies (each drawn from a formula), and stars scattered through space that stretch into streaks while the camera flies. Galaxies away from the centre of the screen are turned to face home's camera, so they look as intended from home and reveal their depth when you fly to them.
- **A black hole** (`SIGHTS.bh` in `universe.js`), in home's sky and one of the sights (`#blackhole`): the camera flies straight up to it and the hole fills the sky above its words. It is **ray-traced**, not painted, in the last step of each frame: for every pixel near it the ray of light is followed backwards along its real path in the curved space around the hole (Schwarzschild; the step of Riccardo Antonelli's *Starless*: a = −1.5·h²·p/|p|⁵), and shows whatever that path meets — the hole, the thin disk of hot gas each time it crosses it, or the sky it escapes to. The shadow, the thin ring of light that went round it, the disk bent over the top and under the bottom and the Einstein ring of whatever lies behind (galaxies are bent into arcs) all come out of that. The gas glows like a black body at the thin disk's temperature (inner edge at the last stable orbit), bluer and brighter on the side coming at us and redder going away (Doppler), dimmer and redder deep in the pull (gravitational redshift); its clumps and streaks turn with it, the inside faster than the outside, in three rings of pattern blended by radius, so it never winds itself up or starts over. Farther out the bending is small and is done as a point lens. The disk leans against a fixed axis, so it is seen from above both from home and up close. **When it is only a few pixels wide** (far away, seen from the Earth or the Moon) it fades out: it is traced over everything, so a speck of it would show through whatever stands in front.
- **The band of our galaxy** across the sky, like the Milky Way on a dark night: painted once (`BANDGEN_FS`), on a computer a low arch behind the interface (seen on both sides and under the clock), on a phone a long diagonal (`bandShape()`). Star clouds made of countless faint stars, a brighter heart, winding lanes and clouds of dust (drawn in a second pass that hides the far stars behind them), pink knots of gas, blue haze and faint wisps reaching out of its edges; thousands more faint stars crowd along it. The nebulae sit inside it and the galaxies around it, as in the real sky.
- **Depth in the wonders**: each is drawn on a square that always faces the camera, so it is built in layers at different depths (the gas behind, a veil of dust in front, stars each at their own depth) that slide against each other with `uPar`, how far the line of sight leans off the wonder's front (`parallax()` in `wonders.js`): turning or flying, they show their depth. Their gas drifts, their stars twinkle, the Ring's filaments turn.
- **The black hole from afar** (`HOLE_FS`, `drawHoleFar`): the trace lies over everything, so it only takes over from about 6 px across (it hands over between 3 and 6 px); smaller, the hole is drawn in its place among the galaxies as it looks from far away (its tilted pink disk, its shadow, its thin ring of light), shrinking to a speck, so it never pops in or out of the sky.
- **The black hole behind the Earth and the Moon**: it is traced over everything in the last step, so the Earth and the Moon report where they stand (`api.occlude`) and it is not traced there (`uOcc` in `COMP_FS`).
- **No black dots on phones**: a phone's half-float picture can hold infinity where many bright stars pile up; infinity times fully opaque dust is NaN, which showed as black dots in the edge-on galaxy. The stars are capped lower, the dust is never quite opaque, and the glow and the final picture replace any NaN with the glow around it. **No stairs of squares either**: some phones never blend half-float pictures (they read the nearest texel). Nothing half-float is left to the graphics card to blend: the volume (`UP_FS`) and the glow (`bloomAt` in `COMP_FS`) are blended by hand, four exact reads, and the 3D cloud grids that shape the dust are 8-bit (`R8`), which every card blends.
- **Other wonders** (`js/wonders.js`), each drawn from a formula by the graphics card, in its place in space (so flights and the slow turn move them like everything else), all visible from home and each one a sight: the **Orion Nebula** (pink hydrogen lit by the four Trapezium stars, a veil of dust filaments); the **Pleiades** (nine blue-white stars at their real places, with spikes, in fine streaks of blue reflection nebula, and a hundred fainter members scattered around them); the **Ring Nebula** (it hides what lies behind it as much as there is gas, so the sky's band does not run through it as a line; a real 3D shell walked through along the line of sight: a barrel of gas densest round its waist, seen nearly down its axis, which leans as the camera moves; teal inside, then green-yellow, orange and a red rim, dark knots of dust on the ring's inner edge, the white dwarf in the middle); a **red giant feeding a white dwarf** (the giant a ball, not a disk: a few huge boiling cells on a turning sphere, darker and redder towards its limb, a thin hot glow round it; round all over but drawn out to a point towards its companion, a stream of gas curving from that point onto a disk, the two orbiting in 70 s and hiding each other); the **Antennae** (two galaxies colliding: merging cores, dust lanes, pink knots of newborn stars, and two long curved tidal tails: grainy streams of stars, narrow and bright near their disks, wider, fainter and broken up further out). **A wonder fades in** (about a second and a half, `api.appear`) once its program is ready, instead of popping into the sky.
- **Now and then, a supernova**: every 3–9 minutes while the universe is alive, a star in a far galaxy flares in a second, blue-white (a soft round glow: no diffraction spikes, which drew hard lines across the sky); its **blast wave** (a ragged shell, blue-white at its front and orange behind, the space inside glowing) comes straight at us at a steady speed, so, like a real explosion seen from far away, it creeps out of the star for about 20 s and then, in its last second, rushes over the whole sky (its apparent size is x/√(1−x²) for a sphere of radius x at distance 1: `waveAt()`); it leaves the screen at its farthest corner the moment it reaches us (24 s), and everything flashes white and the sky shakes (not with animations turned down; drawn over everything, in the `near` phase); then over about a minute the star fades, turns yellow and red, and leaves a small ragged shell of glowing gas. `Wonders.nova(x, y, age)` sets one off (tests).
- **The opening starts at the Earth**: the first time the app opens in a session (Animations = All), the camera starts beside the Earth and the Moon and flies home. Both sit far behind home, so going back to them (the sights `#earth` and `#moon`) is flying back the way the opening came.
  - **The Earth** is the real one (NASA's Blue Marble for its colours, its night lights, where its seas are and its heights, in `img/`: read by the graphics card, with the procedural Earth below while they load or where a page opened from a file cannot use them) and turns: clouds drift in the real climate belts (a line of storms at the equator, the storm tracks of middle latitudes, clear skies over the deserts; painted once round the globe on the graphics card, `api.bake`, and read from that map, a few reads per pixel instead of dozens of layers of noise every frame), mountains catch the low sun, the Sun's small reflection on the sea, reddened light along the line between day and night; its night side dark with city lights (towns thicker on the coasts, joined by roads), green and crimson auroras over the poles, and its thin blue air glowing at the edge.
  - **The Moon** beside it is the real one too (the Lunar Reconnaissance Orbiter's map of its near side, and its heights: `img/moon.jpg`, and `img/moon-4k.jpg` on a computer, loaded once needed), and it hangs **as it does in tonight's sky over Getafe** (`Astro.moonSky`, SunCalc's formulas): its real phase, its bright edge on the side the Sun really is (the position angle of the bright limb), and the whole disc turned as it stands in the sky (the parallactic angle: rising, its north leans one way; setting, the other). Up on the screen is up in the sky. It reflects light like the real Moon: nearly as bright at its edge as in its middle (Lommel–Seeliger), not like a matte ball, with a faint earthshine on its dark side. Dark seas of old lava with soft ragged shores; craters at three sizes (bowls with raised rims that catch or lose the sunlight), fewer on the seas; a few young bright ones; and the rays of two young craters where Tycho and Copernicus are.
  - The farther of the two is drawn first, so the nearer one covers it where they meet on the screen.
- **Meteor showers on their real dates** (`Astro.shower`, after the IMO calendar: Quadrantids, Lyrids, η-Aquariids, Perseids, Draconids, Orionids, Leonids, Geminids, Ursids): around each peak there are more shooting stars, and many of them start near the shower's radiant and fly outwards from it.
- **Shooting stars and comets**: a shooting star every few seconds (now and then two together), starting anywhere and crossing in any direction: a hot blue-green head with a soft halo and a tapering tail that cools to orange, glows and flickers, and flares a little before it dies. Comets cross the screen from one side to the other, nearly level: they come in over one edge (tail and all) and leave over the other, bright all the way, often two or three at once; most drift across in about a minute, some shoot across in ten or fifteen seconds. Six kinds, after real ones (`COMET_KINDS`), and never two of the same kind at once: a great comet (curved dust tail and straight blue ion tail), an ion comet (a long blue tail split into streamers), a dusty golden comet (a wide curved fan), a small green comet (green coma, short faint tails), a comet breaking up into pieces, and a sungrazer with a very long bright tail. They live in space, nearer than the galaxies, so when the camera flies they grow, slide and pass by like everything else. Their tails always trail behind them along their path, turned a few degrees at most, the dust tail curving gently to that side: a soft fan that widens and dims as it spreads, brightest just behind the head, and a thin straight blue ion tail with soft knots drifting out along it. The comet grows and brightens as it passes closest and the coma breathes. Shooting stars glow up and fade away softly. Only with Animations = All.
- **Like a camera**: light is added up in high dynamic range and developed with a soft curve, a faint glow around bright things (bloom), a vignette and a fine dither against banding.
- **Every sight lives** (Animations = All): at a sight the camera swings further round what it looks at (about ±17° and ±7°, a swing a minute), so it is seen from one side and then the other; and each thing moves by itself: the Whirlpool's arms sweep round and the ring galaxy's knotty ring turns (`rot` in `galaxies.js`); the Orion Nebula's gas churns and streams in three sheets at different depths that slide against each other, its heart breathing; the Pleiades are a ball of stars at their own depths that turns slowly, so stars pass in front of and behind each other (sixty fainter members turning with them); the Ring Nebula's shell precesses and its gas streams outwards; the Antennae are a pair that turns in 3D (their plane foreshortening and swinging), the cores circling, the disks' arms turning and the tails sweeping. All of it also answers the camera's own turn (`uPar`), by depth.
- **The universe is alive** (Animations = All and Quality = High): stars orbit, arms turn, the camera floats gently and slowly **turns around what it looks at** (at home around a point among the galaxies, in a section around its galaxy, which stays in the same place on the screen, at a sight around it), so every galaxy is seen from changing angles and near things move against far ones: that is what makes the depth visible. With a mouse the view also leans a little towards the pointer. The turn fades out during flights (1.5 s) and back in on arrival (6 s), eased at both ends, so the camera's speed never jumps between the flight and the turn. While you scroll the sky keeps moving, drawn a little less often (about 30 frames a second on a computer, 22 on a phone) so the scrolling stays smooth; it pauses when the tab is hidden and after 2 minutes without touching anything; then nothing is drawn at all. `Universe.seek(seconds)` jumps that time forward and `Universe.shoot()` sends a shooting star and a comet (tests).
- **Budget**: phones draw about a third of the stars, smaller maps and at about 30 frames a second; computers about 60 (every frame of a 60 Hz screen, every other one of a faster screen; flights, shooting stars and comets every frame). Each galaxy's volume (its soft light and dust, the costliest part of a frame) is drawn at half the resolution and spread over the full picture; the stars stay sharp (about 40% less per frame, the same picture within 1/255). The render size adapts within a second or two if the device cannot keep up. Automated tests use a tiny budget (`?tier=phone` or `?tier=desk` forces one).
- Every galaxy has its own shape in `GALAXIES` (`js/galaxies.js`), after beautiful real ones:
  - **Nolan (home)**: a blue **grand-design spiral** seen nearly face-on, high on the right (like the Whirlpool, M51: two broad, clumpy arms full of pink knots, and a small yellow companion, NGC 5195). Its arms are a **logarithmic spiral** (`logS`: they keep a steady pitch of about 20° out to the rim, as real arms do; wound in step with the radius, they closed into circles at the edge). It turns visibly while you look, and it is also a sight of its own (`#whirlpool`).
  - **UC3M**: a golden **barred spiral**, low on the left (like NGC 1300: a straight bar of old stars, made by long aligned inner orbits and a cigar-shaped bulge, with two open arms). Lively too: it turns while you look.
  - **Nolan in construction** (`forge`): an amber **elliptical**.
  - **The ring galaxy** (`ringgalaxy`, like Hoag's Object): a round yellow core, a dark gap and a nearly perfect ring of young blue stars, knotty (clusters with gaps between them, in its light and in its stars), with two small companions; and **the edge-on galaxy** (`edgeon`, like M104): a big bright bulge cut by its dark ring of dust. They were the "to explore" galaxies (once named Andrómeda and Sombrero); now they are sights, with no section and no name of their own.
  - `Universe.view(id)` says where a galaxy sits on the screen (tests).
  - **No drawn edges**: a disk's stars thin out smoothly towards the rim (the young ones, in the arms, from half the radius), the halo's stars thin outwards and its glow fades to nothing before the sphere it is drawn in ends. (A sharp end of the stars lined the outermost orbits up into a circle round the disk; a halo thicker outwards, and a glow cut at its sphere, showed as a see-through bubble.)
- Without WebGL2 there is no 3D universe: `js/sky.js` draws a simpler sky with CSS layers instead.
- **To add a section** (a checklist, so nothing is forgotten):
  1. its galaxy in `GALAXIES` (`js/galaxies.js`): kind and shape, size, angle, colours, where it sits seen from home (`at.d` computer, `at.m` phone), and `star`, the colour of its bright star in the sky of stars (Effects = Medium) — `sky.js` reads it from there;
  2. a card on home (`index.html`, inside `.p-cards`) with `data-scene="<id>"` (its galaxy), and its texts in both languages (`i18n.js`);
  3. its page: a route in `router.js` (`isHome` if it opens inside home) and its view (`home.js`, `sceneOf`);
  4. a guest must not see it if it shows any data: `.p-cards` is hidden for a guest, and `router.js` sends a guest home from every route except home, Settings and the sights;
  5. a test in `tests/run.js` that opening it flies into its galaxy, and the list of galaxies in the Astral test (`nolan,uc3m,forge`, three painted, four built with the companion) brought up to date.
- **To add a sight** (a checklist too):
  1. where it is and how big it looks:
     - a wonder made with `skyWonder` (`wonders.js`): give it `sight:"<id>"` and `vis`, how much of its square it really fills (so the camera frames what shows, not the empty corners);
     - a wonder with its own code: a list `sights:[{id, p, R, k}]` (where, how big in world units, and `k`: above 1 a closer look, below 1 a wider one);
     - a galaxy: an entry in `SIGHT_GALAXIES` (`universe.js`) (and the galaxy itself in `js/galaxies.js`).
     `layout()` puts it in `PLACES` and `sightView()` frames it: nothing else to place by hand;
  2. its words in both languages (`i18n.js`): `sight.<id>.name`, `sight.<id>.tag` (on its card), `sight.<id>.fact` (the line above its name) and `sight.<id>.text` (a few words below it);
  3. its entry in `SIGHTS` (`home.js`), in the place it should have in the tour: `id`, `ac` (its colour) and `icon` (a small SVG, viewBox 48×48). Its place in the dock, the page, the route `#<id>` and the arrow keys follow by themselves. The `id` must be the same in all three places;
  4. the tests (`tests/run.js`): the sights test goes through `Home.sights()` by itself, so a new sight is flown to and checked on all four screens with nothing to add; only the number of sights in the home test (eleven now) must change.
- **Just the sky**: the eye button (on home and in UC3M's header) hides the whole interface and leaves the universe on the screen; Nolan's logo at the bottom or Escape brings it back (`js/view.js`). The button fades to almost nothing when left alone, and while you look the sky never goes to sleep. Not shown with Effects = Minimal.
- **Notes and Settings belong to every section**: their buttons are in UC3M's header and on home, they open where you are without moving the camera, and the back button (Nolan's logo, big and on its own, as on every page that goes back) takes you back there.
- **The logo is the home button** (top left in UC3M).
- The opening of home (the N drawing itself, NOLAN appearing) plays after the PIN (or Guest) and when the app starts.
- **Log out** (Settings, red button): `Gate.lock()` forgets the device, puts the camera back in deep space and returns to the entry screen, so the next PIN lands at home. For a guest the same button reads "Salir del modo invitado" and does the same.
- With Animations = Basic or None there are no flights (the camera jumps) and the universe stands still. Quality = Medium has no 3D universe: the sky of stars of `js/sky.js` (see above). Quality = Low has no universe at all: a plain dark background.

## Home

Home (`#home`, `js/home.js`, `css/home.css`) is a window on top of everything: the page behind cannot be clicked or tabbed into.

- **The first screen is the hero alone**: Nolan's logo, NOLAN, the time, the greeting and the sky outside (the weather), filling the screen. A small arrow at its foot (`#homeMore`) says there is more below: it scrolls down to the list, and fades once you scroll.
- **Further down**, where to go:
  - "Where to?": the **section cards**, UC3M (the week, the class now or next, the next assessment) and Nolan;
  - **"Start the journey"** (`#tourStart`): the first and biggest thing in home's list, a window onto space (a rim of light turning round it, stars twinkling, a small world with its rings and moon). It flies to the Earth and starts **the tour**: from there you choose where to go (nothing moves on by itself). Hidden without the 3D universe.
- **A sight's page** (`#sightView`, route `#<id>`): the camera flies there, the hero steps aside and the words sit low over a soft shade, so the sight fills the sky above them: a short line on what it is, its name, a few words and "Destination n of 11".
- **The tour's dock** (`#tour`, fixed at the foot of the screen on every sight, written by `home.js` from `SIGHTS`): every place with its icon, colour and name (the one you are at lit, and brought to the middle on a phone, where the dock scrolls sideways); choosing one flies there. At its two ends the arrows to the previous and the next place (the list goes round); on the right Nolan's logo, back home. The arrow keys ← → go to the previous and the next place. On a short screen (a phone on its side) the few words are left out, so they do not cover the sight. Back on home, the list is where you left it.
- **Back and Escape walk back the way you came** (`router.js`): every place of home you go to (home, a sight, Notes, Settings, Nolan), and the app from home, is a step in the browser's history, so the phone's Back and Escape return to the place before, home or the tab you came from, with the same flight as going forward (`Home.visit`). In the app Escape first closes an open detail panel. With nothing of the site behind (a link opened directly), Escape falls back to `Home.back()`: from a sight or Nolan to home, from home to the app. Tabs themselves do not fill the history.
- At the top right: just the sky, Notes and Settings.
- In code: `Home.enter(id, go)` flies there and then shows it (`go`), `Home.isSight(id)`, `Home.sights()`, `Home.back()`.

## The astral theme

The whole site lives in the night sky:

- **Sea of stars**: drawn by the 3D universe (see above). Only without WebGL2, `js/sky.js` and `css/sky.css` draw a fixed `#sky` instead: four layers of stars in real star colours (drawn once on canvas and used as tiles), film grain and a vignette, slow drift, twinkling, scroll parallax and shooting stars.
- **Glass** (`css/astral.css`): cards, tab bar and buttons are dark translucent glass with starlight borders and glows; section titles end in a four-point star.
- **Effects** (`js/effects.js`): soft points of light where you tap, sparks and a ring of light when a task is ticked. Stars in the interface are round points of light, never geometric shapes.
- **The sky outside** (`js/weather.js`, on home): weather now, today's high and low, chance of rain and the next sunrise or sunset. Weather from Open-Meteo, place names from BigDataCloud, both free and without keys, saved for 20 minutes.
  - The place is where the device is (the browser asks once, after the PIN); if not allowed, Getafe. If the browser already allows it and nothing is saved yet, that place comes first, not Getafe.
  - Only the newest request may change the card: an older, slower answer (the last place, or Getafe) never overwrites the weather of where the device turned out to be.
  - Before the weather arrives the card already has its full shape ("—" in each figure, dimmed), so nothing on home moves when it comes.
  - Without connection it tries again every 20 minutes (not every minute), and at once when the connection is back. The sun is still computed offline (`js/astro.js`).
  - A guest gets Getafe's weather, without being asked where they are, and nothing is saved.
- **Your constellation** (Tasks): one star per task, lit and joined when done. A new star is born (its small flare) only when you tick a task here, never for ticks that arrive from the cloud.
- **Ticks light up** like stars: a tick pops only when you tick it (class `.just` in `tasks.js`), not when ticks arrive from the cloud or the tab opens again.
- **The red "now" line** ends in a glowing point. Each minute it and the words in the day's header ("quedan 30 min", `#dayLive`) are moved and rewritten in place, so they never fade in again. While home is open, *Today* and Tasks measure nothing (the page behind is not drawn); they catch up when shown.

How much of it runs depends on the Effects setting (High = Animations All + Quality High; Medium = All + Medium; Minimal = None + Low; the table shows every pair, which the code still handles):

| | Quality High | Quality Medium | Quality Low |
|---|---|---|---|
| **Animations All** | everything | glass and glows over a still sky of simple stars; no galaxies, stardust, warp or shooting stars | plain background, no glass or glows; ripple and bursts only |
| **Animations Basic** | the sky stands still; no stardust, warp or shooting stars | the same, still | plain and still |
| **Animations None** | nothing moves | nothing moves | everything off |

In code: `fullMotion()` for decorations that move, `lowMotion()` for any motion, `highQuality()` for heavy visuals, `fancy()` (both) for the showy extras.

## Name and logo

The site is called **Nolan**. The logo is an astral N: four identical four-point stars joined by straight lines, symmetric (green → blue gradient): `favicon.svg` is the source; `favicon.ico`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` are rendered from it. The same mark sits small in the header (`.brand-mark` in `index.html`).

## What the site has

| Part | What it does |
|---|---|
| **Home** (house icon, `#home`; also where the app starts) | First screen: the time, a greeting and a weather card (now, high, low, rain, next sunrise/sunset) for where you are. Further down, where to go: the sections **UC3M** and **Nolan**, and the **sights** of the universe (see *Home*). The UC3M card sums up the week, the class now and the next assessment. Also buttons for just the sky, Notes and Settings. |
| **Sights** (`#earth`, `#moon`, `#blackhole`, `#whirlpool`, `#ringgalaxy`, `#edgeon`, `#orion`, `#pleiades`, `#ring`, `#binary`, `#antennae`, inside home) | The camera flies to each one and frames it whole, with its name, a few words and arrows (or ← →) to the previous and the next. |
| **Schedule** (`#schedule`) | *Today*: the day's classes with their room, the red "now" line and "X min left"; the next 7 days; the week's dates and advice. Below: the weekly timetable. A class that is not every week (an extra class, a lab) shows its next day in its block. **Tap any class** and a little pop-up beside it says when it is: every week from when to when, or each of its days (past ones struck, the next one marked, with the room of each day when it changes: `rooms` in `CLASSES`). The clash bar names the dates too. |
| **Month** (`#planner`) | The monthly planner of the whole year, in its own tab. **+ Add** (or a tap on a day) adds an event of your own; tap it to change or delete it (see *Your own events*). |
| **Subjects** (`#subjects`) | One card per subject: timetable and rooms, faculty, grading with a grade calculator, dates, and syllabus with progress. |
| **Exams** (`#exams`) | Everything graded, with filters. Past items are dimmed. **Add to my calendar** (`js/ics.js`): downloads `nolan-uc3m.ics` with every exam and submission that has a day, for the phone's own calendar: Madrid time (with its time zone), reminders the day before and an hour before, windows of several days as all-day events that also warn the day before they close, and the same ID each time, so importing again updates instead of duplicating. Dates without a day stay out (the note says how many) until `data.js` has them. |
| **Tasks** (`#tasks`) | Tasks per subject and general ones. Ticks are saved to the cloud. |
| **Faculty** (`#faculty`) | Table with email and office. |
| **Notes for Claude** (`#notes`, inside home) | Free text saved to the cloud. **Claude cannot read JSONBin**: to pass them on, press *Copy notes* and paste into the chat. |
| **Settings** (`#settings`, inside home) | Language (Spanish / English), **Smooth scrolling** (On / Off, off by default, `js/smooth.js`: the mouse wheel glides the page and anything scrolling under the pointer; trackpads, phones, text boxes and reduced motion are left as they are; no reload) and **Effects**, one choice for animations and quality together (`LOOKS` in `prefs.js`): High (the living 3D universe: animations all, quality high), Medium (a sky of stars you can fly through: all, medium) and Minimal (a plain background, nothing moves: none, low). Saved on each device. There is only the dark look (the light theme was removed in v0.52). Changing any of them reloads the page through a passage: the screen fades softly (≈0.4 s) to the colour of the empty night sky, not a flat black, the page reloads behind it and the new look fades in (`js/shift.js`). The fades run on the compositor, so the busy start of the page behind cannot make them stutter; while the passage covers the screen completely (`html.shift-dark`) the universe draws nothing but the one frame the passage waits for. The passage opens when the page is ready — the universe built and drawn, the saved data read, the font in — but never waits more than 2.5 s: a galaxy still being built then fades in by itself. At the bottom, the red button: Log out (for a guest: leave guest mode). |
| **Nolan** (`#nolan`, the amber galaxy) | Built like the UC3M app (its header: the logo back home, the clock, the date, the week) with three windows of his own, one at a time: **Día** (`#nolan/dia`: one day in order, with arrows), **Semana** (`#nolan/semana`: seven columns; a phone, one under another; tap a day to open it) and **Mes** (`#nolan/mes`: the month planner). Day and week show the UC3M classes and events, his weekly routine (`ROUTINE` in `data.js`), his plans (`PERSONAL`) and every event added with **+** (the + of the day and the week opens the month's form on that day). |

On mobile the tabs sit at the bottom and you can swipe between them.
Old Spanish links (`#horario`, `#asignaturas`, `#notas`…) still work, and the old `#soon/andromeda` and `#soon/sombrero` links fly to the ring galaxy and the edge-on galaxy.

---

## Languages

- The **code** is in English: names, comments, files.
- The **interface** comes in English (the default) and Spanish (chosen in Settings) (`js/i18n.js`). Every visible text goes through `t("key", {vars})`:
  - Add a new text to **both** `STRINGS.es` and `STRINGS.en`.
  - A plural is an object `{one, other}`, chosen by `vars.n` (or use `tn(key, n)`).
  - Static texts in `index.html` use `data-i18n` (text), `data-i18n-html`, `data-i18n-aria`, `data-i18n-title` and `data-i18n-placeholder`. The Spanish text is also written in the HTML, so the page reads fine before JavaScript runs.
  - Dates are formatted with `fmtLong`, `fmtShort`, `fmtDayShort`, `fmtDayMonth`, `fmtRange`, `fmtMonthYear`, `dayName` (mid-sentence form) and `termOrdinal`.
- The **data** (`data.js`, `eval.js`) stays in Spanish: it is copied from UC3M documents. Its keys are English.
- A missing translation falls back to Spanish and is listed in the `#debug` panel. The tests fail if any key is missing.

---

## File map

Each file does one thing. To change something you usually only need one or two.

### Data (what changes most)

| File | Contains |
|---|---|
| `data.js` | Subjects (`SUBJECTS`), timetable (`CLASSES`), faculty (`FACULTY`), graded dates (`EVENTS`), terms (`TERMS`), academic calendar (`CALENDAR`), weekly advice (`ADVICE`), tasks (`TASKS`, `GENERAL_TASKS`), and Nolan's own weekly routine (`ROUTINE`) and plans (`PERSONAL`). |
| `js/galaxies.js` | What each galaxy of the 3D universe is made of (`GALAXIES`, `COMPANIONS`): where it sits, how it is turned, its disk, arms, bulge, colours and star counts. Data only. |
| `eval.js` | Grading and syllabus of each subject (`GRADING`). |
| `config.js` | JSONBin key for saving to the cloud. Without it the site works but does not save. |

### Code (`js/`), in load order

| File | What it does |
|---|---|
| `prefs.js` | Settings (`SETTINGS`, `saveSetting`) and `lowMotion()` / `fullMotion()` / `highQuality()` / `fancy()`. |
| `i18n.js` | Spanish and English texts (`t`, `tn`) and date formatting. |
| `core.js` | Shared helpers: dates, weeks, term in force, classes on a day (`classesOn`), event labels (`eventLabel`, `whenLabel`), detail panel, error banner. |
| `shift.js` | The passage (a soft fade) when a setting reloads the page. |
| `gate.js` | The entry screen: Nolan's logo, which opens the PIN keypad, and the Guest button; guest mode (`Gate.guest()`); Log out / leave guest mode (`Gate.lock()`); `Gate.onOpen` for what must wait for the way in. |
| `wonders.js` | The other wonders drawn by the 3D universe: nebulae, the Pleiades, a feeding binary, the Antennae, supernovae, the Earth and the Moon. Each declares the sights it is (where, how big). They register themselves in `window.UNIVERSE_EXTRAS`, so it loads before `universe.js`. |
| `shaders.js` | The graphics card's programs (GLSL text, `UNIVERSE_SHADERS`): galaxy maps, stars and volumes, the far sky, meteors and comets, the glow and the final picture with the traced black hole. Text only, no state. |
| `galaxies.js` | See *Data* above. |
| `universe.js` | The 3D universe engine (WebGL2): builds and draws the galaxies (from `galaxies.js`, with the programs of `shaders.js`) on exact orbits, the far sky, shooting stars and comets, the camera flights, the sights (`PLACES`, `sightView()`), and its slow life. |
| `sky.js` | A simpler CSS sky, only for devices without WebGL2, and the sky of stars of Effects = Medium (`window.Stars`). |
| `validate.js` | Checks `data.js` and `eval.js` before rendering (`PERSONAL` and `ROUTINE` too). Whatever would break the page is left out and reported at the top; odd things go to the console and `#debug`. |
| `derived.js` | Computed data: clashes between classes (added to `EVENTS`) and the timetable grid layout. |
| `cloud.js` | Saving to JSONBin, by changes, queued and without overwriting anything; read only after the PIN, never for a guest (see *The cloud*). |
| `header.js` | Clock, date, week and figures, and the compact header: scrolled down, the tab bar (computer) keeps the logo = home, the time, Aula Global, Notes and Settings; on a phone the header shrinks to one row with the time. It is the only clock: it emits the `minute` and `newDay` events. |
| `astro.js` | The real sky, offline: sunrise and sunset, the Moon's phase (for the Moon, its sight and its words), the meteor shower going on (more shooting stars). |
| `weather.js` | Weather and sun on home: only the newest answer counts, a card of the same size while it waits; for a guest, Getafe's weather, not kept. |
| `schedule.js` | Weekly timetable (grid and list by day) and the clash status bar. |
| `today.js` | The *Today* viewer (the red line and `#dayLive` are moved in place each minute). |
| `subjects.js` | Subject cards and grade calculator (`subjectCard`, `recalc`). |
| `ics.js` | "Add to my calendar": builds the `.ics` of every exam and submission (RFC 5545). |
| `faculty.js` · `exams.js` · `tasks.js` · `notes.js` · `planner.js` · `settings.js` | One tab, page or block each. `planner.js` is `makePlanner(box, {events, personal, mine, where})` plus `MyEvents` (your own events): the Month tab and Nolan's month are two planners. |
| `nolan.js` | **The Nolan section**: its header and its three windows (day, week, month). Everything new for Nolan goes here. |
| `home.js` | The home window: the hero, the section cards (UC3M / Nolan), the journey (`SIGHTS`, the tour's dock and its arrows) and each sight's page; Notes and Settings open inside it. |
| `router.js` | Routes (`#schedule`, `#home`, `#nolan/…`, the sights; old `#soon/…` links go to the galaxies they were), tabs, the swipe gesture and the Escape key (back). It keeps a guest on home, its sights and Settings, and shows the page once it has chosen the first view (`data-booting`). |
| `view.js` | Just the sky: hides the interface to enjoy the universe. |
| `sw.js` (root) | The offline copy: a service worker (see *Offline*). |
| `debug.js` | `#debug` panel with screen measurements, data warnings and missing translations. |
| `smooth.js` | Smooth scrolling for the mouse wheel (Settings → Smooth scrolling, off by default). |
| `effects.js` | Ripple and stardust on tap, star burst on ticking a task, warp on changing tab, and *idle* (decorations pause after 2 minutes without touching anything). |

### Design (`css/`)

`base` · `sky` · `header` · `tabbar` · `today` · `schedule` · `planner` · `subjects` · `exams` · `tasks` · `home` · `nolan` · `settings` · `effects` · `astral` · `cinema`.
Each one has its own mobile tweaks at the end.

- **Colours** are tokens on `:root` in `base.css` (`--space`, `--paper`, `--card`, `--card-solid`, `--ink`, `--ink-2`, `--rule`, `--go`, `--warn`…). Use them instead of fixed colours. `--card` is see-through glass; use `--card-solid` where nothing may show through.
- **Animations setting**: `<html data-motion="full|basic|none">`. `basic` stops the decorations that move on their own; `none` stops everything (`effects.css`, section 13). In JavaScript, check `fullMotion()` for decorations and `lowMotion()` for everything else.
- **The marks on `<html>`** set by the `<head>` script of `index.html` before painting: `data-locked` (the entry screen; `cinema.css` hides the rest), `data-guest` (a guest), `data-booting` (nothing of the page shows until `router.js` has chosen the first view, so the first frame is never the wrong page; if a script fails it shows anyway after 3 s). `universe.js` adds `gl` or `nogl`.

---

## Quick guide for an AI: changing the calendar

Everything the calendars show comes from **`data.js`** (the guest's demo: `demo.js`). Change the data, never the code: the monthly planner (the **Mes** tab and Nolan's calendar), *Today*, the next 7 days, the weekly timetable, *Exams*, the subject cards and **Add to my calendar** all read it and redraw by themselves. Then bump the version (see *Publishing a version*).

| To… | Edit | Example |
|---|---|---|
| add or move an exam, a submission, a one-off class | `EVENTS` (one line each) | `{subject:"is", date:"2026-10-08", what:"Examen parcial I", weight:"15 %", type:"ex", time:"10:45–12:15", room:"Aula 2.3.D01"}` |
| mark a date not yet known | the same line with that week's Saturday and `noDay:1` | `{…, date:"2026-12-05", noDay:1, label:"por confirmar"}` |
| something open several days | add `until` | `{…, date:"2026-10-26", until:"2026-10-31"}` |
| say what an exam covers | add `syllabus` | `syllabus:"Hasta teoría de juegos"` |
| a weekly class, or one on loose dates | `CLASSES` (`from`/`to`, or `dates` and optional `rooms`, one per date) | see *A class* below |
| something every week in Nolan's day and week (gym, a class, work) | `ROUTINE` (`day` 0 Monday … 6 Sunday) | `{day:1, start:"19:00", end:"20:30", what:"Gimnasio", place:"Polideportivo", color:"#3FD9A4"}` |
| a personal plan (Nolan's calendar only) | `PERSONAL` | `{date:"2026-10-12", what:"Cena", time:"21:00", place:"Casa", color:"#FFA640"}` |
| a holiday, an exam period, a break | `CALENDAR.holidays` / `CALENDAR.periods` | `{date:"2026-10-12"}` · `{from:"…", to:"…", type:"exams", label:"…"}` |
| a mark on a day ("Empiezan las clases") | `CALENDAR.marks` | `{date:"2027-01-26", label:"Empiezan las clases"}` |
| grading, weights, what each exam covers per week | `eval.js` (`GRADING.<subject>`) | `parts`, `rules`, `syllabus` |
| the advice of a week | `ADVICE[term][week]` | plain sentences |

Rules that save a test run: dates are always `"YYYY-MM-DD"`; `subject` must be a key of `SUBJECTS`; times are text (`"09:00–10:30"`, an en dash). `js/validate.js` checks the data when the page loads and shows a red warning naming any bad line, so opening the page once is enough to know it is right. The events added with **+** are not in `data.js`: they live in the cloud (see *Your own events*) and need no code change at all.

## How to add things

**A graded date** → `data.js`, list `EVENTS`:

```js
{subject:"ed", date:"2026-11-13", what:"Segundo parcial: bloque 2", weight:"25 %", type:"ex",
 time:"09:00–10:30", room:"Aula 2.2.C04", format:"Presencial y escrito", syllabus:"Temas 5 y 6"}
```

- `type`: `ex` exam · `en` submission · `cl` class or lab · `cf` clash.
- The week and the date label ("vie 13 nov") are computed.
- If **the day is unknown**: use that week's Saturday and `noDay:1`. It shows as "semana N". A custom text can go in `label`.
- If it **lasts several days** (an online test open Monday to Saturday): `until:"2026-10-31"`. The planner joins the first and last day with a line.
- If it is **online**: `online:1`, so there is no warning that there is no class that day.
- It shows up by itself in the subject card, *Today*, the planner, *Exams* and the week (and exams also in Nolan's calendar).

**A personal plan** (Nolan's calendar only) → `data.js`, list `PERSONAL`, one line each:

```js
{date:"2026-10-12", what:"Cena con la familia", time:"21:00", place:"Casa", color:"#FFA640"},
```

Only `date` and `what` are needed; `until` (last day, for several days), `time`, `place`, `note` and `color` are optional. Nothing else to touch.

**Your own events** → nothing to edit: each calendar has **+ Add** (and a tap on an empty spot of a day), a small form (what, day, until, time, where, note, colour), and each of your events can be changed or deleted from its detail (deleting asks for a second tap). They live in `MyEvents` (`planner.js`): for Nolan in the cloud (record key `eventos`, one change per event, so two devices never undo each other, and offline they wait on the device like ticks), without the cloud on the device (`localStorage`, `nolan-my-events`), and a guest's for that visit only (`sessionStorage`, `nolan-guest-events`), like everything else of a guest. The UC3M calendar shows the ones added there (`where:"uc3m"`); Nolan's shows them all.

**A class** → `data.js`, list `CLASSES`:

```js
{subject:"ec", day:3, start:840, end:930, kind:"laboratorio", room:"INF 7.0.J04", when:"24 sep · 22 oct", group:"82",
 dates:["2026-09-24","2026-10-22"]}
```

- `day`: 0 = Monday … 4 = Friday.
- `start`/`end`: minutes since midnight (840 = 14:00).
- A weekly class has `from`/`to`; a class on loose dates has `dates`.
- Half width, hatching for loose dates and clashes are computed.

**A task** → `TASKS.<subject>` or `GENERAL_TASKS`: `["Title","Detail"]`.
Each tick is tied to the title, so tasks can be removed or reordered without moving the others.

**Advice for a week** → `ADVICE[term][week]`.
Advice only: that week's dates are added on top automatically.

**Term 2**:

1. New entries in `SUBJECTS` with `term:2`.
2. Their classes in `CLASSES`, grading in `GRADING` and faculty in `FACULTY`.
3. Optionally, advice in `ADVICE[2]`.

From 26 January the site shows those subjects by itself; syllabus progress, the header figures and the label change too. Until they are added, term 1 keeps showing.

**A new setting** → add its values to `SETTINGS_DEFAULTS` and `SETTINGS_OPTIONS` (`prefs.js`), a row in `ROWS` (`settings.js`) and its texts (`s.set.*` in `i18n.js`). Animations and quality are still two settings underneath (`SETTINGS.motion`, `SETTINGS.quality`, read by the rest of the code), but Settings only offers them together, as the levels of `LOOKS`.

**A new section** → see *To add a section* in *The universe*.

**A new wonder in the sky** → `js/wonders.js`: `skyWonder("id",{at:{d:[x,y],m:[x,y]}, z, R, rot, blend:"add"|"over", sight, vis, shader, uniforms})`. `at` is where it sits seen from home (share of half the screen, computer and phone), `z` how far, `R` its radius in space; `sight` its name as a sight and `vis` how much of its square it really fills (see *To add a sight*). The shader gets `vQ` (−1…1 across the sprite), `uT` time, `uA` fade and `uS` a seed, plus `fbm`/`h12` from universe.js, and `fbmA(angle, k, offset, y, octaves)`: noise along an angle from `atan` must use it, not `fbm(vec2(angle*k, y))`, because `atan` jumps from π to −π and plain noise shows that jump as a straight line out of the centre (the line that crossed the Ring Nebula and the supernova). Something that does not sit still writes its own `{id, shaders, layout(api), draw(api, phase, t, now), sights}` and pushes it to `window.UNIVERSE_EXTRAS` (see the supernova, and the Earth and the Moon); multiply its fade by `api.appear(x)` so it fades in once its program is ready. A shader that does not compile is left out with a warning; the rest of the universe goes on. Add it to the list in the wonders test.

**A new sight** → see *To add a sight* in *The universe*.

**Nolan** → `js/nolan.js` (content) and `css/nolan.css` (design). Sub-pages work: `#nolan/anything` reaches `Nolan.render(box, "anything")`.

---

## Code rules

- **No libraries, no build.** Each file in `js/` is a plain script. Anything declared at the top level with `const` or `function` in one file is visible from the next ones.
- **An error in one file does not take the others down.** A red banner at the top also shows the file and the message.
- **Events** (`document.addEventListener`):
  - `minute`: the minute changes.
  - `newDay`: the day changes; `detail` is the date.
  - `tab`: a tab opens; `detail` is its name.
  - `cloud`: the saving status changes; `detail` is `{kind, text}`.
- **Dates** are `"YYYY-MM-DD"` strings. To work with them use `fromISO` (noon, safe from daylight-saving changes) and `addDays`.
- **What changes every minute is updated in place**, only where something changed (the text of home, the red line, the weather card): rebuilding it would restart its animations and make it flicker.
- **Style**: English, comments that explain *why*, nothing written by hand if it can be computed from the data.

## Offline

The site works without a connection (`sw.js`, a service worker, registered at the end of `index.html` when the site is served over the web):

- **The page** comes from the network first, so a new version is seen as soon as there is signal; without signal, from the copy kept on the device. It is asked of the server itself, not of the browser's own cache (`cache:"no-cache"`), which could keep an old page for minutes.
- **Its files** (css, js, data, icons) carry the version in their address (`?v=…`), so the kept copy is always right and they load instantly.
- **What to keep is read from `index.html` itself** (every `href` and `src`, plus the manifest's icons): nothing to list by hand. Each fresh `index.html` drops the files of older versions and fetches the new ones, so only one version is ever kept. Publishing a version needs nothing extra.
- **Your data**: `cloud.js` keeps the last copy read on the device, so ticks, grades and notes show offline; changes made offline are kept on the device too and go up when the connection is back, even after closing the app.
- The weather keeps its last reading, and sunrise and sunset are computed offline.
- Installable: add it to the home screen (`manifest.webmanifest`) and it opens like an app, with or without signal.

## The cloud

`cloud.js` saves to JSONBin the task ticks (`hechas`), the exam grades (`grades`), the notes for Claude (`notas`) and your own calendar events (`eventos`, an object by id). Those record keys stay in Spanish on purpose: renaming them would lose what is already saved.

- **It is read only after the PIN** (`Gate.onOpen`), and never for a guest: nothing of yours is asked for behind the entry screen.
- **The copy kept on this device shows at once**, while the fresh one is read: your ticks, grades and notes are there from the start, and the fresh read only changes what did change. Listeners get `(rec, {copy:true})` for that copy (`Cloud.onLoad((rec, info)=>…)`). The notes show that copy at once, but you can type in them only once the fresh read has arrived.
- Nothing is written until the first read succeeds. It retries by itself and your changes wait in a queue.
- It saves **by changes** ("this task done", "this grade") on top of a fresh read, so it never overwrites what you did not touch.
- When the app is hidden or closed, pending changes are flushed. When you come back after a while, it reads again.

Settings are not in the cloud: they are per device (`localStorage`, key `settings`).

## Publishing a version

1. Never publish two different versions under the same number: the offline copy keeps each file by its `?v=` for good, so a device would go on mixing the old files with the new page.
2. Versions are numbered 0.49, 0.50…; the current one is **0.82**. Bump the number in `index.html`: the footer (`v0.81`; the entry screen shows the same number, copied from it) and every `?v=0.81` of the code files, all at once. If the logo changes, also bump the `?v=` of the icons in `index.html` and `manifest.webmanifest`: browsers keep favicons cached for a long time and only fetch them again when the URL changes.
2. Upload the changed files to GitHub, keeping the `js/` and `css/` folders.
3. GitHub Pages takes a minute or two. The footer number tells you which version you are seeing.

## Tests

```
node tests/run.js
```

Needs Node and Playwright. 134 checks in a real browser, 138 with the PIN (see below). They never reach the real cloud or the real weather (`config.js` may hold real keys): JSONBin, Open-Meteo and BigDataCloud are cut off in every test, unless the test puts a fake of its own in front.

**The PIN is not in the tests either** (the repository is public). The checks that type it read it from the environment:

```
NOLAN_PIN=<the PIN> node tests/run.js                  (Git Bash, macOS, Linux)
$env:NOLAN_PIN="<the PIN>"; node tests/run.js          (PowerShell)
```

Without `NOLAN_PIN` those three checks are skipped and say so (the flight after the right PIN, the device remembered, the PIN landing at home after Log out); every other check runs, with the device already remembered, as after a right PIN. With it there is one more check: that `NOLAN_PIN` really is the PIN (its hash is the one in `gate.js`), so a wrong one is never typed as if it were right.

- the page loads without errors, nothing is wider than a phone, and it shows once the first view is chosen (`data-booting` gone);
- the entry screen: at first only the logo and the Guest button, nothing read from the cloud behind it, the logo (or a digit typed on a keyboard) opens the keypad, a wrong PIN, the remembered device, the PIN nowhere in the page (without `NOLAN_PIN`: no run of six digits in the page has the PIN's hash), Log out; with `NOLAN_PIN`, also the flight into home and the next PIN landing at home;
- starting at home, the camera flights (UC3M, the second click, back home), Notes opened from UC3M without leaving its galaxy, "Start the journey", the dock (a place chosen in it, the dock fixed in place, its arrows; no timed autopilot), the arrow keys, Escape from a sight back home, the old `#soon/…` links flying to their galaxies, and Notes and Settings inside home (and tappable on a phone over a sight);
- **the sights**: every sight is flown to and framed whole, in the middle and above its words, on four screens (a computer, two phones and a phone on its side); the black hole in home's sky and up close; the Earth far behind home, filling the middle with the Moon beside it, and the black hole (a speck from there) not traced over it;
- **guest mode**: no UC3M, Nolan or Notes, nothing read from the cloud, Getafe's weather without the device's location and not kept, every page of the app sending back home, still a guest after reloading, and the way out in Settings;
- **no flicker**: the red line moves in place (a new minute never fades it in again), home's cards do not blink when the opening ends, the weather card keeps its size when the weather arrives, and ticks do not pop (nor stars get born) when the cloud answers, while a tick of your own pops and its star is born;
- the tabs, and old Spanish links;
- the red line at different times, the minute change and midnight;
- dates without a day and multi-day windows (and the line that joins them in the planner);
- the cloud, with a simulated JSONBin: a failed or slow first read, migration of old ticks, and this device's copy on screen before the cloud answers (notes read-only until then);
- grades with a comma;
- the home window: it blocks the page behind (which is not drawn at all meanwhile), Escape back to the same tab, its first screen is only the hero and the sections and the eleven sights come when you scroll (the arrow takes you there); just the sky; Nolan;
- settings: no light theme, the passage when a setting reloads the page, English after reloading, every text translated in both languages (every sight's words too), English dates, and the animation levels;
- the astral layer: weather and sun on home, the five galaxies and their three companions built (UC3M the golden barred spiral low on the left, home the blue spiral), the Moon's phase and the meteor showers (checked against known dates), the band of our galaxy, the seven wonders compiled and drawn, a supernova, the Earth at the opening, Quality = Low and Medium (the sky of stars, flying into UC3M's star), the three Effects levels and the tasks constellation;
- the compact header when scrolled;
- the swipe gesture;
- idle;
- offline: the site opens without a connection, and a task ticked offline survives reopening and is saved once online.

Add a test whenever you fix a bug.

---

## Credits

- The Earth's pictures (`img/earth-day.jpg`, `img/earth-aux.jpg`): NASA's Blue Marble and Black Marble, with its water mask and topography (NASA Earth Observatory / Visible Earth; public domain), as packed by the `three-globe` project; resized, and the night lights, seas and heights packed into one picture's three colours.
- The Moon's (`img/moon.jpg`, `img/moon-4k.jpg`): NASA / GSFC / Arizona State University, the LRO Wide Angle Camera's global mosaic and its heights, resized and packed the same way.

## Roadmap

Ordered by how much it will be noticed.

1. **Final exam dates.** The official windows are 16–22 December and 11–25 January. The days are missing; add them to `EVENTS` as soon as they are out.
2. **Syllabus of each exam** (`syllabus` in `EVENTS`). It already shows in the detail panel when present.
3. **Term 2.** The structure is ready: only the data is missing (see above).
4. **Nolan.** His month calendar is there; more of Nolan goes in `nolan.js`.
5. **Term average.** With the calculator grades and the ECTS, the weighted average and what each final needs.
6. **Fixed Madrid time**, even when the phone is in another time zone (travel).
7. **Tests on GitHub.** Run `tests/run.js` with GitHub Actions on every upload.
