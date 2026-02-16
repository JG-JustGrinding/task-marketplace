export const CATEGORY_OPTIONS = [
	"Music / Sound",
	"Art / Sprites",
	"UI",
	"Writing",
	"Programming",
	"Other",
] as const;

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

