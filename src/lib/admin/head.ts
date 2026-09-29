/** Admin pages are private: noindex and no descriptive public metadata. */
export const adminHead = (section: string) => () => ({ meta: [
  { title: `${section} · Admin — HouseProvider.in` },
  { name: "robots", content: "noindex, nofollow" },
  { name: "description", content: "Private HouseProvider operations area." },
] });
