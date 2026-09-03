# Changelog

All notable Rocket Doge changes, reconstructed from Git history.

This document broadly follows [Keep a Changelog](https://keepachangelog.com/). Dates and versions prefixed with `v` come from Git tags.

## [Unreleased]

### Added

- Production deploy on Vercel at [rocket-doge.vercel.app](https://rocket-doge.vercel.app).

### Removed

- Unused 2014 ImpactJS tree from the repository and git history. Playable sprites and SFX already live under `public/media`.

## [1.0.0] – 2026-09-03

A full rewrite of the 2014 ImpactJS runner into a 2026 web game. The playable path no longer uses Impact, Grunt, Bower, jQuery, or Facebook.

### Breaking changes

- Replaced the ImpactJS 1.23 module graph and baked `game.min.js` with a Vite + TypeScript + Canvas 2D runtime.
- The UI shell is [SvenJS 3.2.1](https://svenjs.xyz/), with the SvenJS stamp in the footer.
- Dropped the ImpactJS 1.23 sources, Grunt/Bower bake, and original media from the playable tree.

### Added

- Seven enemy types with distinct motion: crab, bluejay, spike mine, roboskull (including late-game tunnels), meteor, balloon cat, and tracking UFO.
- A single spawn director with fairness gaps, coin formations, jetpack fuel, and heart pickups.
- Three lives, i-frames, screen shake, exhaust particles, and floating Doge-speak.
- Video-harvested sprite sheets for Doge walk, Doge fly, crab walk, and bluejay flap.
- Looping hillside and ground strips, slow cloud parallax, and a readable menu hint.
- Web Audio chiptune plus comic crash stings (boing, bonk, yip, honk, slide); death gets a longer cartoon fall.
- Keyboard, pointer, and touch: hold to fly, P/Esc to pause.
- High score in `localStorage`.

### Changed

- Boost no longer refills almost instantly on the ground. Walking drips fuel; the jetpack pickup restores most of a tank.
- Score is distance plus coins. Game over is a dedicated screen with Play again and Menu — no five-second auto-return.
- Canvas is letterboxed at 960×540 with `devicePixelRatio` scaling.

### Fixed

- One-hit death, unused monster patterns, overlapping generators, and the unreadable menu caption on the grass.

## [Unversioned changes] – 2018-07-13

The GitHub repo first appeared in 2018 with the 2014 ImpactJS build (`package.json` `0.1.0`). Those commits were later dropped from this history when the unused 2014 sources were purged.

## [0.1.0] – 2014

The original iOS/web release on ImpactJS. Not tagged in this Git history.
