export type ProjectEntry = {
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
  year?: number;
};

export const projects: ProjectEntry[] = [
  {
    title: "Sample Project",
    url: "https://example.com",
    imageUrl: "/media/USBHub.jpg",
    year: 2023,
    description:
      "Replace this with your own projects. Add entries in app/projects/data.ts.",
  },
];
