export interface Listing {
  id: number;
  title: string;
  categories: string[];
  description?: string;
  price: number;
  currency?: string;
  longDescription?: string;
  requirements?: string;
  images?: string[];
  projectTitle?: string;
  projectSummary?: string;
}

export const LISTINGS: Listing[] = [
  {
    id: 1,
    title: "Kick animation for fighting game character",
    categories: ["Design", "Development", "Game"],
    description:
      "Need a 1-second loop of a character performing a high kick, with clean silhouette and clear impact frames. Pixel art style, 60 FPS, 64x64 resolution.",
    longDescription:
      "We need a snappy, readable kick animation for our main fighter character. The goal is to clearly convey anticipation, impact, and follow-through while staying within our 64x64 resolution and pixel art style. You can work from an existing idle pose and rough storyboard.",
    requirements: "64x64\n60 FPS\npixel art style\nclean silhouette\nclear impact frames",
    images: [
      "https://placehold.co/800x500/111827/FFFFFF?text=Character+Sprite+Sheet",
      "https://placehold.co/800x500/020617/FFFFFF?text=Kick+Keyframes",
    ],
    projectTitle: "Indie pixel fighter prototype",
    projectSummary:
      "This task is part of an early-stage pixel art fighting game prototype focusing on expressive, readable combat animations for a small roster of characters.",
    price: 30,
  },
  {
    id: 2,
    title: "Theme song for tech podcast",
    categories: ["Design", "Music"],
    description:
      "Looking for a catchy 10-15 second instrumental theme for a weekly tech podcast. Something upbeat and modern, with synth elements.",
    longDescription:
      "We publish a weekly show about software, startups, and internet culture. The intro theme should feel modern but not overly aggressive, and loop cleanly for flexible use in different segments.",
    projectTitle: "Weekly tech podcast brand refresh",
    projectSummary:
      "We are refreshing the podcast’s visual and audio identity. This theme will be used across intro, outro, and promo content.",
    price: 50,
  },
  {
    id: 3,
    title: "Meta ads setup for new ecommerce brand",
    categories: ["Marketing"],
    description:
      "Set up Meta and Google campaigns for a DTC brand; need tracking + creative guidance.",
    price: 200,
  },
  {
    id: 4,
    title: "Clean and normalize survey dataset",
    categories: ["Data", "Admin"],
    description:
      "We have a messy CSV with ~10k rows that needs cleaning, deduping, and basic descriptive stats.",
    price: 150,
  },
  {
    id: 5,
    title: "Voice actor that says 'You have a new message'",
    categories: ["Audio", "Voiceover", "Voice"],
    description:
      "Need a clear, friendly voice recording of the phrase 'You have a new message' for use in a mobile app notification.",
    price: 5,
  },
];
