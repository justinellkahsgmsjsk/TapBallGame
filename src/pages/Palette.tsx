import { useEffect } from "react";
import PaletteGenerator from "@/components/PaletteGenerator";

const Palette = () => {
  useEffect(() => {
    document.title = "The Palette Studio — Color Palette Generator";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Generate beautiful color palettes with harmony modes. Lock colors, copy hex codes, export as CSS or JSON.",
      );
    }
  }, []);

  return <PaletteGenerator />;
};

export default Palette;
