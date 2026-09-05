/* =========================================================
   NOCTURNE DYNAMIC CAMERA NETWORK
   Cameras are generated from the case's actual locations.
   This module is intentionally self-contained so the existing
   simulation and UI remain untouched except where explicitly
   wired into visual evidence.
   ========================================================= */

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildCameraNetwork(locations) {
  const areas = Array.isArray(locations) ? locations.filter(Boolean) : [];

  return areas.map((area, index) => ({
    id: `CAM-${String(index + 1).padStart(2, "0")}`,
    area: String(area),
    type: "CCTV",
    position: index % 2 === 0 ? "ceiling-mounted" : "wall-mounted",
    view: index % 3 === 0
      ? "wide-angle overview"
      : index % 3 === 1
        ? "fixed corridor perspective"
        : "fixed room entrance perspective",
    anchor: slug(area)
  }));
}

function getCamera(network, cameraId) {
  const id = String(cameraId || "").trim().toUpperCase();
  return (Array.isArray(network) ? network : []).find(c => c.id === id) || null;
}

module.exports = {
  buildCameraNetwork,
  getCamera
};
