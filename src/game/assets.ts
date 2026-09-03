export type SpriteName =
  | "player"
  | "playerFly"
  | "crab"
  | "bluejay"
  | "coin"
  | "fuel"
  | "heart"
  | "cloudSmall"
  | "cloudLarge"
  | "balloonCat"
  | "roboskull"
  | "meteor"
  | "ufo"
  | "spikeMine"
  | "title"
  | "btnPlay"
  | "btnAgain"
  | "ground"
  | "hills";

const PATHS: Record<SpriteName, string> = {
  player: "/media/player.png",
  playerFly: "/media/player-fly.png",
  crab: "/media/crab.png",
  bluejay: "/media/bluejay.png",
  coin: "/media/coin.png",
  fuel: "/media/fuel.png",
  heart: "/media/heart.png",
  cloudSmall: "/media/cloud-small.png",
  cloudLarge: "/media/cloud-large.png",
  balloonCat: "/media/balloon-cat.png",
  roboskull: "/media/roboskull.png",
  meteor: "/media/meteor.png",
  ufo: "/media/ufo.png",
  spikeMine: "/media/spike-mine.png",
  title: "/media/title.png",
  btnPlay: "/media/btn-play.png",
  btnAgain: "/media/btn-again.png",
  ground: "/media/ground.png",
  hills: "/media/hills.png",
};

export type Assets = Record<SpriteName, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<Assets> {
  const entries = await Promise.all(
    (Object.keys(PATHS) as SpriteName[]).map(async (key) => {
      const img = await loadImage(PATHS[key]);
      return [key, img] as const;
    }),
  );
  return Object.fromEntries(entries) as Assets;
}
