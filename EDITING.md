# Editing El Rio yourself

## The quickest way to find any text

Open the folder in VS Code and press **Ctrl+Shift+F** (search all files). Type a few words you can see on the screen, for example `Take-away messages`. VS Code shows the file and line. Change the text there and save.

## Where the text lives

| What you see | File | Look for |
| --- | --- | --- |
| Front page (why we play, figures, Punjab and Haryana, take-away messages) | `src/ui/screens/Purpose.tsx` | `LINKS`, `It happens in real basins`, `Take-away messages` |
| Game page (map captions, ministry cards, how it works, lecturer notes) | `src/ui/screens/Landing.tsx` | `ZONE_TEXT`, `MINISTRY_ROLE`, `For lecturers` |
| Ministry briefs, targets, option names and summaries, hint texts | `src/data/baseline.ts` | `brief:`, `targetLabel:`, `summary:`, `hintMore:`, `hintLess:` |
| All numbers in the model (limits, targets, costs, yields) | `src/data/baseline.ts` | `targets:`, `limits:`, `COEFFICIENTS` |
| Reveal steps (water, power, food, verdict) | `src/ui/screens/Reveal.tsx` | `case 0:` to `default:` |
| Red hints under failing checks, "Your part" lines | `src/ui/game.ts` | `hintFor`, `playerContribution` |
| Nexus Council screen | `src/ui/screens/Council.tsx` | `Nexus Council` |
| Debrief table and lessons | `src/ui/screens/Debrief.tsx` | `lessons` |
| Data and assumptions table | `src/data/assumptions.ts` | `ASSUMPTIONS` |
| Footer line | `src/ui/App.tsx` | `footer` |
| Browser tab title and search description | `index.html` | `<title>` |
| Colours and fonts | `src/styles/tokens.css` | `--agri`, `--display` |

## Three rules for editing text safely

1. **Text between tags** looks like `<h2>Take-away messages</h2>`. Change only the words between `>` and `<`.
2. **Text in quotes** looks like `summary: "Cheap, clean power."`. Change only the words inside the quotes and keep the quotes and the comma.
3. **Do not delete** curly braces `{ }`, angle brackets `< >` or the commas at the ends of lines. If you need a `{` or `<` in your text, ask for help first.

If the page goes blank after an edit, undo with **Ctrl+Z**, save, and try again. The terminal running `npm run dev` names the file and line that broke.

## See your changes live

Once, install [Node.js](https://nodejs.org/) 22.6 or later, then in a terminal:

```
cd C:\git\CLEWs_Lecture_iExplore
npm install
```

Each time you edit:

```
npm run dev
```

Open the address it prints (usually http://localhost:5173). Every time you save a file, the browser updates by itself.

## After changing numbers

Run the tests. They check that the silo trap still works and that the hint button still reaches a working plan:

```
npm test
npm run calibrate
```

If a test fails, the game no longer teaches its lesson with your numbers. Change the number back or ask for help.

## Publish your changes

- **If the site is connected to GitHub and Netlify:** commit and push. Netlify runs the tests, builds the site and publishes it within about a minute.

  ```
  git add .
  git commit -m "Describe your change"
  git push
  ```

- **If you use Netlify Drop:** run `npm run build` and drag the new `dist` folder onto your site's *Deploys* page in Netlify.
