export type ImageAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type VideoAsset = {
  src: string;
  poster: string;
  label: string;
  objectPosition: string;
};

const pathFor = (folder: string, filename: string) =>
  `/media/${folder}/${encodeURIComponent(filename)}`;

const image = (
  filename: string,
  width: number,
  height: number,
  alt: string,
): ImageAsset => ({
  src: pathFor("photos", filename),
  width,
  height,
  alt,
});

const video = (
  filename: string,
  poster: string,
  label: string,
  objectPosition: string,
): VideoAsset => ({
  src: pathFor("videos", filename),
  poster: pathFor("posters", poster),
  label,
  objectPosition,
});

export const identityAssets = {
  logo: pathFor("identity", "logo sem fundo.png"),
  logoWithBackground: pathFor("identity", "logo com fundo.png"),
  favicon: pathFor("identity", "favicon.png"),
} as const;

export const heroMedia = image(
  "2 (1).jpg",
  1440,
  1919,
  "Mulher usando óculos escuros e jaqueta vermelha em retrato editorial",
);

export const homeVideos = [
  video(
    "video (4).mp4",
    "video-4.jpg",
    "Óculos escuros em uso diante da loja",
    "50% 28%",
  ),
  video(
    "video (2).mp4",
    "video-2.jpg",
    "Armações em uso no interior da loja",
    "50% 26%",
  ),
  video(
    "video (3).mp4",
    "video-3.jpg",
    "Armações claras e escuras vistas em movimento",
    "50% 27%",
  ),
] as const;

const assertUnique = (paths: readonly string[], route: string) => {
  if (new Set(paths).size !== paths.length) {
    throw new Error(`Asset repetido na rota ${route}.`);
  }
};

assertUnique(
  [heroMedia.src, ...homeVideos.map((item) => item.src)],
  "home",
);
