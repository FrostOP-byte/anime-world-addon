const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const PORT = Number(process.env.PORT || 7000);

// Only add streams you own or are expressly authorized to distribute.
// This environment variable must contain a JSON array.
let configuredStreams = [];

try {
  const value = JSON.parse(
    process.env.AUTHORIZED_STREAMS_JSON || "[]"
  );

  if (Array.isArray(value)) {
    configuredStreams = value;
  }
} catch {
  console.error("Invalid AUTHORIZED_STREAMS_JSON; no streams enabled.");
}

const SERIES_ID = "animeworld:dbz-kai";
const EPISODE_ID = `${SERIES_ID}:s1e1`;

const catalog = [
  {
    id: SERIES_ID,
    type: "series",
    name: "Dragon Ball Z Kai",
    description:
      "Anime catalog entry. Hindi audio has not been verified.",
    genres: ["Anime", "Action", "Adventure"]
  }
];

const builder = new addonBuilder({
  id: "org.example.animeworld",
  version: "1.0.0",
  name: "Anime World — Legal Sources",
  description:
    "Anime catalogue with authorized sources. Hindi audio is labelled only when verified.",
  resources: ["catalog", "meta", "stream"],
  types: ["series"],
  idPrefixes: ["animeworld:"],
  catalogs: [
    {
      type: "series",
      id: "anime_catalog",
      name: "Anime Catalogue",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
});

// Catalogue and search
builder.defineCatalogHandler(({ type, id, extra }) => {
  if (type !== "series" || id !== "anime_catalog") {
    return Promise.resolve({ metas: [] });
  }

  const query = String(extra?.search || "")
    .trim()
    .toLowerCase();

  const metas = catalog
    .filter(item => !query || item.name.toLowerCase().includes(query))
    .map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      genres: item.genres
    }));

  return Promise.resolve({ metas });
});

// Series details and episode metadata
builder.defineMetaHandler(({ type, id }) => {
  const item = catalog.find(
    entry => entry.id === id && entry.type === type
  );

  if (!item) {
    return Promise.resolve({ meta: null });
  }

  return Promise.resolve({
    meta: {
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      genres: item.genres,
      videos: [
        {
          id: EPISODE_ID,
          title: "Episode 1 — metadata placeholder",
          season: 1,
          episode: 1
        }
      ]
    }
  });
});

// Stream lookup: empty unless an authorized URL is configured.
builder.defineStreamHandler(({ type, id }) => {
  if (type !== "series") {
    return Promise.resolve({ streams: [] });
  }

  const streams = configuredStreams
    .filter(item =>
      item &&
      item.videoId === id &&
      item.authorized === true &&
      typeof item.url === "string" &&
      item.url.startsWith("https://")
    )
    .map(item => ({
      name: item.hindiAudioVerified === true
        ? "Hindi audio verified"
        : "Audio language unverified",
      title: item.title || "Authorized video source",
      url: item.url
    }));

  return Promise.resolve({ streams });
});

serveHTTP(builder.getInterface(), { port: PORT });

console.log(`Anime World add-on listening on port ${PORT}`);
