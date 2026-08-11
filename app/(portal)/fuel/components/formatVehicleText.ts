export function formatVehicleRegistration(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text.toUpperCase() : "UNKNOWN";
}

export function formatVehicleNamePart(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";

  return text
    .split(" ")
    .map((part) =>
      part
        .split("-")
        .map((segment) =>
          segment
            ? `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`
            : segment,
        )
        .join("-"),
    )
    .join(" ");
}

export function formatVehicleMakeModel(make?: unknown, model?: unknown) {
  return [formatVehicleNamePart(make), formatVehicleNamePart(model)]
    .filter(Boolean)
    .join(" ");
}
