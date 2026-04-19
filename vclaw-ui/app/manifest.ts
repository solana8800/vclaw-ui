import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VClaw",
    short_name: "VClaw",
    description: "Trợ lý vận hành và bán hàng cho hộ kinh doanh nhỏ",
    start_url: "/",
    display: "standalone",
    background_color: "#120a0c",
    theme_color: "#D13238",
    icons: [
      {
        src: "/vclaw-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
