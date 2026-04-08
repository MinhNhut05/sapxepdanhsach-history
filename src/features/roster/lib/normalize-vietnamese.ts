export const vietnameseCollator = new Intl.Collator('vi', {
  sensitivity: "base",
  numeric: true,
});

export function normalizeVietnameseText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function toTitleCaseSegment(segment: string): string {
  if (!segment) {
    return "";
  }

  const lowerCased = segment.toLocaleLowerCase("vi-VN");

  return (
    lowerCased.charAt(0).toLocaleUpperCase("vi-VN") + lowerCased.slice(1)
  );
}

export function toDisplayNameCase(value: string): string {
  return normalizeVietnameseText(value)
    .split(" ")
    .filter(Boolean)
    .map((token) =>
      token
        .split("-")
        .map((segment) => toTitleCaseSegment(segment))
        .join("-"),
    )
    .join(" ");
}
