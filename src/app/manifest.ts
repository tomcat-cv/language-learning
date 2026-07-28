import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{
  return {name:"日々 — 日语学习",short_name:"日々",description:"从 N5 开始，真正把日语用起来。",start_url:"/",display:"standalone",background_color:"#f4f0e7",theme_color:"#d94a38",lang:"zh-CN"};
}
