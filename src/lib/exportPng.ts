/** Download the graph SVG as a PNG file. */
export async function exportSvgElementAsPng(
  svg: SVGSVGElement,
  filename = "krumath-visualizer.png",
): Promise<void> {
  const width = svg.clientWidth || Number(svg.getAttribute("width")) || 800;
  const height = svg.clientHeight || Number(svg.getAttribute("height")) || 600;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("width")) clone.setAttribute("width", String(width));
  if (!clone.getAttribute("height")) clone.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");

    const parentBg = svg.parentElement
      ? getComputedStyle(svg.parentElement).backgroundColor
      : "";
    ctx.fillStyle =
      parentBg && parentBg !== "rgba(0, 0, 0, 0)" && parentBg !== "transparent"
        ? parentBg
        : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error("PNG export failed"));
          return;
        }
        const downloadUrl = URL.createObjectURL(pngBlob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        resolve();
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG for export"));
    img.src = src;
  });
}
