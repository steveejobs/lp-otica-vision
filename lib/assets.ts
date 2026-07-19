import { IMAGE_PLACEHOLDERS } from "./image-placeholders";

export type VisualSeriesId =
  | "series1"
  | "series2"
  | "series3"
  | "series4"
  | "series5"
  | "series6"
  | "series7";

export type ImageAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
  objectPosition: string;
  blurDataURL: string;
  placeholderColor: string;
  seriesId: VisualSeriesId;
};

type GalleryChapter = {
  id: VisualSeriesId;
  images: readonly ImageAsset[];
};

export type VideoAsset = {
  src: string;
  poster: string;
  label: string;
  objectPosition: string;
};

export type BrandAsset = {
  name: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  scale: number;
  maxWidth: number;
  maxHeight: number;
};

const pathFor = (folder: string, filename: string) =>
  `/media/${folder}/${encodeURIComponent(filename)}`;

const image = (
  seriesId: VisualSeriesId,
  filename: string,
  width: number,
  height: number,
  alt: string,
  objectPosition = "50% 50%",
): ImageAsset => {
  const placeholder = IMAGE_PLACEHOLDERS[filename];

  return {
    src: pathFor("photos", filename),
    width,
    height,
    alt,
    objectPosition,
    blurDataURL: placeholder?.blurDataURL ?? "",
    placeholderColor: placeholder?.color ?? "var(--vision-silver-light)",
    seriesId,
  };
};

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

const brand = (
  name: string,
  filename: string,
  width: number,
  height: number,
  scale: number,
  maxWidth: number,
  maxHeight: number,
): BrandAsset => ({
  name,
  src: pathFor("brands", filename),
  alt: `Logo ${name}`,
  width,
  height,
  scale,
  maxWidth,
  maxHeight,
});

export const identityAssets = {
  logo: pathFor("identity", "logo sem fundo.png"),
  favicon: pathFor("identity", "favicon.png"),
} as const;

const visualSeries = {
  series1: [
    image(
      "series1",
      "1 (1).jpg",
      1358,
      1810,
      "Retrato editorial com óculos escuros pretos e textura felpuda",
      "50% 46%",
    ),
    image(
      "series1",
      "1 (2).jpg",
      1440,
      1919,
      "Close lateral com óculos escuros pretos e detalhe metálico na haste",
      "50% 45%",
    ),
    image(
      "series1",
      "1 (3).jpg",
      1440,
      1920,
      "Retrato frontal com óculos escuros pretos e casaco de textura felpuda",
      "50% 44%",
    ),
  ],
  series2: [
    image(
      "series2",
      "2 (1).jpg",
      1440,
      1919,
      "Mulher usando óculos escuros e jaqueta vermelha em retrato editorial",
    ),
  ],
  series3: [
    image(
      "series3",
      "3 (1).jpg",
      1440,
      1919,
      "Retrato em tons neutros com óculos escuros e braço elevado",
      "50% 42%",
    ),
    image(
      "series3",
      "3 (2).jpg",
      1440,
      1919,
      "Retrato em tons neutros com óculos escuros e mão sobre o cabelo",
      "50% 42%",
    ),
  ],
  series4: [
    image(
      "series4",
      "4 (1).jpg",
      1440,
      1919,
      "Retrato com óculos amplos de lente marrom sobre fundo escuro",
      "50% 44%",
    ),
    image(
      "series4",
      "4 (2).jpg",
      1440,
      1911,
      "Retrato com óculos de lente espelhada e jaqueta vermelha",
      "50% 40%",
    ),
  ],
  series5: [
    image(
      "series5",
      "5 (1).jpg",
      1440,
      1919,
      "Detalhe editorial de armação de grau e reflexo na lente",
      "50% 42%",
    ),
    image(
      "series5",
      "5 (2).jpg",
      1440,
      1919,
      "Perfil com armação de grau tartaruga e lente clara",
      "48% 42%",
    ),
  ],
  series6: [
    image(
      "series6",
      "6 (1).jpg",
      1440,
      1919,
      "Retrato com armação tartaruga e acabamento em tom quente",
      "50% 43%",
    ),
    image(
      "series6",
      "6 (2).jpg",
      1440,
      1919,
      "Retrato frontal com óculos tartaruga e acabamento quente",
      "50% 40%",
    ),
    image(
      "series6",
      "6 (3).jpg",
      1440,
      1919,
      "Close frontal com óculos estreitos de lente marrom",
      "50% 43%",
    ),
  ],
  series7: [
    image(
      "series7",
      "7 (1).jpg",
      1440,
      1919,
      "Perfil com óculos de lente marrom e casaco em tom neutro",
      "50% 43%",
    ),
    image(
      "series7",
      "7 (2).jpg",
      1440,
      1919,
      "Retrato frontal com óculos de lente marrom sobre fundo escuro",
      "50% 42%",
    ),
    image(
      "series7",
      "7 (3).jpg",
      1440,
      1919,
      "Close com óculos de lente marrom e acabamento translúcido",
      "50% 43%",
    ),
  ],
} as const;

export const visionTakeoverMedia = [
  visualSeries.series6[0],
  visualSeries.series6[1],
  visualSeries.series6[2],
] as const;

export const heroMedia = visionTakeoverMedia[0];

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

const homeGalleryChapters = [
  { id: "series1", images: visualSeries.series1 },
  { id: "series3", images: visualSeries.series3 },
  { id: "series4", images: visualSeries.series4 },
] as const satisfies readonly GalleryChapter[];

export const editorialGalleryImages = homeGalleryChapters.flatMap(
  (chapter) => chapter.images,
);

export const brandLogos = [
  brand("Ray-Ban", "logo-rayban.png", 1280, 1280, 1.34, 104, 42),
  brand("Carrera", "carrera (1).png", 800, 157, 0.9, 112, 30),
  brand(
    "Persol",
    "persol-logo-png-transparent.png",
    2400,
    2400,
    1.42,
    104,
    40,
  ),
  brand("Tom Ford", "Tom-Ford-logo.png", 3840, 2160, 1.12, 108, 30),
  brand(
    "Swarovski",
    "Swarovski-Logo-2016.png",
    3840,
    2160,
    1.1,
    108,
    34,
  ),
  brand(
    "Dolce & Gabbana",
    "images__2_-removebg-preview.png",
    447,
    447,
    2.2,
    86,
    38,
  ),
  brand(
    "Jimmy Choo",
    "Jimmy_Choo_Ltd-Logo.wine.png",
    3000,
    2000,
    1.6,
    104,
    36,
  ),
  brand("Max Mara", "Max-Mara-logo.png", 1280, 720, 1.1, 104, 30),
  brand("Versace", "versace-logo.png", 1280, 659, 0.88, 94, 42),
  brand(
    "Emilio Pucci",
    "Emilio-Pucci-Logo.png",
    1280,
    720,
    1.28,
    106,
    34,
  ),
] as const;

export const labMedia = visualSeries.series5;

export const instagramVideos = [
  video(
    "video (2).mp4",
    "video-2.jpg",
    "Modelos de óculos em uso no interior da Ótica Vision",
    "50% 26%",
  ),
  video(
    "video (3).mp4",
    "video-3.jpg",
    "Óculos claros e escuros apresentados em movimento",
    "50% 27%",
  ),
  video(
    "video (4).mp4",
    "video-4.jpg",
    "Óculos escuros em uso dentro e diante da loja",
    "50% 28%",
  ),
] as const;

const instagramGalleryChapters = [
  { id: "series6", images: visualSeries.series6 },
  { id: "series7", images: visualSeries.series7 },
] as const satisfies readonly GalleryChapter[];

export const instagramImages = instagramGalleryChapters.flatMap(
  (chapter) => chapter.images,
);

const assertUnique = (paths: readonly string[], route: string) => {
  if (new Set(paths).size !== paths.length) {
    throw new Error(`Asset repetido na rota ${route}.`);
  }
};

assertUnique(
  [
    ...visionTakeoverMedia.map((item) => item.src),
    ...homeVideos.map((item) => item.src),
    ...editorialGalleryImages.map((item) => item.src),
    ...brandLogos.map((item) => item.src),
    ...labMedia.map((item) => item.src),
  ],
  "home",
);

assertUnique(
  [
    ...instagramVideos.map((item) => item.src),
    ...instagramImages.map((item) => item.src),
    ...brandLogos.map((item) => item.src),
  ],
  "/bio",
);
