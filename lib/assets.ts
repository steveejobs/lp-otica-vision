export type ImageAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type VideoAsset = {
  src: string;
  poster: string;
  title: string;
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
  title: string,
  objectPosition = "50% 24%",
): VideoAsset => ({
  src: pathFor("videos", filename),
  poster: pathFor("posters", poster),
  title,
  objectPosition,
});

export const identityAssets = {
  logo: pathFor("identity", "logo sem fundo.png"),
  logoWithBackground: pathFor("identity", "logo com fundo.png"),
  favicon: pathFor("identity", "favicon.png"),
} as const;

export const heroMedia = image(
  "1 (3).jpg",
  1440,
  1920,
  "Mulher usando oculos escuros em retrato editorial",
);

export const homeVideos = [
  video("video (2).mp4", "video-2.jpg", "Armacao aviador em uso na loja"),
  video("video (3).mp4", "video-3.jpg", "Armacao vinho vista em movimento"),
  video("video (4).mp4", "video-4.jpg", "Oculos escuros em uso diante da loja"),
] as const;

export const editorialGalleryImages = [
  image("2 (1).jpg", 1440, 1919, "Mulher com oculos escuros e jaqueta vermelha"),
  image("8 (2).jpg", 1440, 1762, "Mulher experimentando oculos escuros na loja"),
  image("3 (1).jpg", 1440, 1919, "Mulher com oculos escuros e look em tons neutros"),
  image("5 (2).jpg", 1440, 1919, "Perfil de mulher usando armacao de grau"),
  image("4 (2).jpg", 1440, 1911, "Mulher usando oculos de lente espelhada"),
  image("8 (3).jpg", 1320, 1615, "Selecao de armacoes organizada em bandeja"),
  image("6 (1).jpg", 1440, 1919, "Mulher usando armacao marrom em retrato editorial"),
  image("7 (3).jpg", 1440, 1919, "Perfil de mulher usando oculos escuros"),
  image("1 (1).jpg", 1358, 1810, "Close de oculos escuros com reflexo nas lentes"),
] as const;

export const labMedia = image(
  "8 (1).jpg",
  1440,
  1762,
  "Detalhe de hastes e acabamento de armacoes",
);

export const instagramVideos = [
  video("video (4).mp4", "video-4.jpg", "Oculos escuros em uso diante da loja"),
  video("video.mp4", "video-1.jpg", "Armacao de grau em uso"),
  video("video (2).mp4", "video-2.jpg", "Armacao aviador em uso na loja"),
] as const;

export const instagramImages = [
  image("1 (2).jpg", 1440, 1919, "Close lateral de oculos escuros"),
  image("2 (2).jpg", 1440, 1919, "Mulher com oculos escuros e jaqueta vermelha"),
  image("3 (2).jpg", 1440, 1919, "Mulher com oculos escuros e look bege"),
  image("4 (1).jpg", 1440, 1919, "Mulher com oculos de lente ampla"),
  image("5 (1).jpg", 1440, 1919, "Mulher usando armacao de grau"),
  image("6 (2).jpg", 1440, 1919, "Mulher ajustando oculos escuros"),
  image("7 (2).jpg", 1440, 1919, "Retrato frontal com oculos escuros"),
  image("8 (4).jpg", 1440, 1762, "Mulher experimentando oculos diante do espelho"),
] as const;

export const brandLogos = [
  { name: "Ray-Ban", src: pathFor("brands", "logo-rayban.png"), scale: 1.35 },
  { name: "Carrera", src: pathFor("brands", "carrera (1).png"), scale: 0.78 },
  { name: "Persol", src: pathFor("brands", "persol-logo-png-transparent.png"), scale: 1.25 },
  { name: "Tom Ford", src: pathFor("brands", "Tom-Ford-logo.png"), scale: 0.86 },
  { name: "Swarovski", src: pathFor("brands", "Swarovski-Logo-2016.png"), scale: 0.88 },
  {
    name: "Dolce & Gabbana",
    src: pathFor("brands", "images__2_-removebg-preview.png"),
    scale: 1.65,
  },
  {
    name: "Jimmy Choo",
    src: pathFor("brands", "Jimmy_Choo_Ltd-Logo.wine.png"),
    scale: 1.05,
  },
  { name: "Max Mara", src: pathFor("brands", "Max-Mara-logo.png"), scale: 0.84 },
  { name: "Versace", src: pathFor("brands", "versace-logo.png"), scale: 0.78 },
  {
    name: "Emilio Pucci",
    src: pathFor("brands", "Emilio-Pucci-Logo.png"),
    scale: 0.82,
  },
] as const;

export const newsFallback = [] as const;

const assertUnique = (paths: readonly string[], route: string) => {
  if (new Set(paths).size !== paths.length) {
    throw new Error(`Asset repetido na rota ${route}.`);
  }
};

assertUnique(
  [
    heroMedia.src,
    ...homeVideos.map((item) => item.src),
    ...editorialGalleryImages.map((item) => item.src),
    labMedia.src,
  ],
  "home",
);

assertUnique(
  [
    ...instagramVideos.map((item) => item.src),
    ...instagramImages.map((item) => item.src),
  ],
  "instagram",
);
