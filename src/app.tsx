import { create } from "svenjs";
import { loadAssets } from "./game/assets";
import { RocketDoge } from "./game/game";
import svenjsMark from "./svenjs-mark.svg";

type AppState = {
  status: string;
};

export const App = create<Record<string, never>, AppState>({
  initialState: { status: "Loading…" },
  async onMount() {
    try {
      const assets = await loadAssets();
      const host = this._stage as HTMLDivElement | undefined;
      if (!host) {
        this.setState({ status: "Missing canvas host." });
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", "Rocket Doge");
      host.innerHTML = "";
      host.appendChild(canvas);
      const game = new RocketDoge(canvas, assets);
      this._game = game;
      game.start();
      this.setState({ status: "" });
    } catch (err) {
      this.setState({
        status: err instanceof Error ? err.message : String(err),
      });
    }
  },
  onDestroy() {
    const game = this._game as RocketDoge | undefined;
    game?.stop();
  },
  render() {
    const { status } = this.state;
    return (
      <div className="page">
        <div
          className="stage"
          ref={(el: HTMLDivElement | null) => {
            this._stage = el;
          }}
        />
        {status ? (
          <p className="status" role="status">
            {status}
          </p>
        ) : null}
        <footer>
          <p>
            Rocket Doge 2026 — hold to fly. Upgraded from the 2014 ImpactJS
            original.
          </p>
          <a
            className="svenjs-credit"
            href="https://svenjs.xyz/"
            rel="noopener noreferrer"
          >
            <img
              className="svenjs-mark"
              src={svenjsMark}
              width="36"
              height="36"
              alt=""
            />
            <span className="svenjs-credit-copy">
              <span className="svenjs-credit-kicker">UI built with</span>
              <span className="svenjs-credit-name">SvenJS 3.2.1</span>
            </span>
          </a>
        </footer>
      </div>
    );
  },
});
