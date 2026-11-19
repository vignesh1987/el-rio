# El Rio

A browser game that teaches the climate, land, energy and water (CLEW) nexus.
It was built for CENG60016 *Technologies to Combat Climate Change* at Imperial College London.

Three ministries share one river. Each one plans alone. The game shows that plans which are sensible inside each silo break the shared system, and then asks the player to fix it.

## How the game works

1. **Round 1: plan alone.** The player is dealt one ministry (Agriculture, Energy or Water Supply). They see only their own target, their own options and their own sector of the map. The computer plays the other two ministries. Each computer ministry submits the cheapest plan that passes its own checks.
2. **Reveal.** The three plans are combined and the game follows the failure step by step: water, then power, then food and city water.
3. **Round 2: Nexus Council.** The player controls all three ministries with the full picture and must find a plan that breaks no limit. A *Give me a hint* button moves one slider toward the cheapest working plan and explains why. From the silo plans, four hints are enough to reach a working plan.
4. **Debrief.** The game compares the silo plans, the player's plan and the cheapest working plan.

The setting is a fictional country, Utopia, with 20 million people, one river (the River), one aquifer and 4.0 million hectares of usable land.

## Run it on your computer

You need [Node.js](https://nodejs.org/) 22.6 or later. The calibration script runs TypeScript files directly, which needs Node 22.6.

```bash
npm install        # once
npm run dev        # open the address it prints, usually http://localhost:5173
```

Keep `package-lock.json` in the repository. If you ever delete it and `npm install` stops with the error `Cannot read properties of null (reading 'edgesOut')`, run `npm install --legacy-peer-deps` once. This works around a known npm problem with one of Vitest's optional dependencies.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the model tests, including the checks that the silo trap still works |
| `npm run calibrate` | Prints the silo plans, the combined outcome and the cheapest working plan |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the built site locally |

## Put the game online

The site is fully static. It has no backend and collects no data.

**Recommended: GitHub + Netlify.** Push this repository to GitHub. In Netlify choose *Add new site → Import an existing project → GitHub* and pick the repository. `netlify.toml` already holds the settings: Netlify runs the tests, builds the site and publishes `dist/`. Every push to `main` redeploys the site. If a test fails, the deploy stops and the previous version stays online.

**Quick test without GitHub: Netlify Drop.** Run `npm run build`, open [Netlify Drop](https://app.netlify.com/drop), log in, and drag the `dist` folder onto the page.

## Project structure

```
src/
  data/
    baseline.ts       Every number in the game: targets, limits, options, coefficients, sources
    assumptions.ts    The "Data and assumptions" table, read from baseline.ts
  model/              Pure calculations. No user interface code.
    types.ts          Shared types and units
    simulate.ts       The nexus model: water -> electricity -> knock-on effects -> checks
    silo.ts           How each ministry judges its own plan; the cheapest silo plan
    reference.ts      The cheapest plan that passes every check (brute-force search)
    hints.ts          The hint button: one move toward the reference plan, with a reason
    search.ts         Helper that loops over every possible plan
  ui/                 Screens and drawings (Preact components)
    App.tsx           Game state and screen order
    game.ts           Text and numbers prepared for the screens
    screens/          Landing, MinistryRound, Reveal, Council, Debrief, Assumptions
    express/          Quick play: plan cards, run the year, fix the basin, score card
    components/       RiverMap, GridMap, LandMap, OptionCard, Meter, Header, Icons
  styles/
    tokens.css        Colours and fonts (light and dark themes)
    app.css           Layout and components
tests/
  simulate.test.ts    One test per nexus link
  calibration.test.ts Checks that the lesson still works after you change numbers
  hints.test.ts       Checks that hints lead to a working plan
scripts/
  calibrate.ts        Prints a calibration report
public/
  images/             Put your own photos here (see public/images/README.md)
```

## Change the text

See [`EDITING.md`](EDITING.md). It lists which file holds each piece of text and how to edit it safely.

## Change the numbers

All numbers are in `src/data/baseline.ts`. Each coefficient has a comment that names its source or marks it as an ASSUMPTION.

After changing a number, run:

```bash
npm test
npm run calibrate
```

The calibration tests check three things:

1. Each ministry's cheapest plan passes its own checks.
2. The three silo plans together cause blackouts of more than 10% of demand and over-pump the aquifer.
3. No single ministry can fix the system while the other two plan in silos, but a plan that works does exist when all three plan together.

If a test fails, the game no longer teaches its lesson with your numbers.

## Model in one paragraph

Farms and cities take water from the river above the dams, so hydropower output scales with the flow that is left (`flow at dams / natural flow`). Tube wells, drip lines, city wells, treatment plants and desalination use electricity that the Ministry of Energy did not forecast. If generation falls short, every user gets the same share of the power it needs, and pumped farms fall back to rain-fed yields. Pumping more than the aquifer's recharge lowers the water table. Land, the environmental flow to the delta and a power-sector CO₂ cap are also checked. The model covers one average year, with no seasons, droughts, return flows or trade.

## Quick play (about 8 minutes)

The front page opens two versions of the game. Both use the same model and numbers.

1. **Pick a ministry.** The computer plays the other two.
2. **Pick one of three plan cards** within 2.5 minutes (the clock only sets a speed bonus). The cheapest card earns three stars. It is the plan a silo ministry would submit.
3. **Run the year.** The three plans combine and the failure plays out: water, then power, then food and taps. Each failed area breaks one of three hearts.
4. **Fix the basin** as the Nexus Council. It plays like golf: *par* is the number of options the cheapest working plan changes, and each hint costs 75 points. Two buttons, *Show the best solution* and *Show the second-best solution*, move every slider to the cheapest and the next-cheapest working plan. Showing a solution costs 300 points, once, and removes the three solving badges.
5. **Score card.** Up to 1,000 points, a rank and five badges. There is no class leaderboard and no data is collected.

The plan cards are in `src/data/express.ts`. The scoring rules are in `src/model/express.ts`. The screens are in `src/ui/express/`. `tests/express.test.ts` checks that every card passes its own ministry's checks and that the combined plan always breaks the basin.

## Roadmap: climate version

The climate version will be a second scenario file, `src/data/climate.ts`, that changes the baseline values. Examples: lower river flow, lower recharge, lower rain-fed yields and higher electricity demand during heatwaves. Event cards such as a drought year can then be added to the reveal. The model code does not need to change for the scenario part.

## Sources

- Elimelech, M. and Phillip, W. A. (2011). The future of seawater desalination: energy, technology, and the environment. *Science* 333, 712–717.
- IPCC (2014). Annex III: Technology-specific cost and performance parameters. In *Climate Change 2014: Mitigation of Climate Change*. Working Group III contribution to the Fifth Assessment Report.
- IRENA (2024). *Renewable Power Generation Costs in 2023*. International Renewable Energy Agency, Abu Dhabi.
- Macknick, J., Newmark, R., Heath, G. and Hallett, K. C. (2012). Operational water consumption and withdrawal factors for electricity generating technologies: a review of existing literature. *Environmental Research Letters* 7, 045802.
- Ong, S., Campbell, C., Denholm, P., Margolis, R. and Heath, G. (2013). *Land-use requirements for solar power plants in the United States*. NREL/TP-6A20-56290.

## Author and licence

Vignesh Sridharan, Department of Chemical Engineering, Imperial College London.

El Rio is free software under the GNU General Public License v3.0 (see `LICENSE`). You may use, change and share it. Any version you share must also be released under GPL-3.0.

The bundled fonts (Archivo, Public Sans, IBM Plex Mono) are under the SIL Open Font License 1.1. Preact is under the MIT licence.
