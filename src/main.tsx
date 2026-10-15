/**
 * Entry point: load fonts and styles, then mount the game.
 * Fonts are bundled with the app (no calls to external font servers).
 */
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/public-sans/index.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { render } from "preact";
import { App } from "./ui/App.tsx";

render(<App />, document.getElementById("app")!);
