// Use plain anchors in descriptions for consistent new-tab behavior
import type { ReactNode } from "react";

export type ProjectEntry = {
  title: string;
  url: string;
  imageUrl?: string;
  description?: ReactNode;
  year?: number;
};

export const projects: ProjectEntry[] = [
  {
    title: "Corginator v2 (SAMD21)",
    url: "https://github.com/Hugoyhu/SAMD21-Corginator",
    imageUrl: "/media/Corginator-SAMD21.jpg",
    year: 2024,
    description: (
      <>
        A successor to the original ATmega328P-based Corginator, the Corginator
        v2 uses the Microchip ATSAMD21G18 chipset to implement a small, corgi
        form-factor development board with the Adafruit Feather pinout. Features
        USB Type-C, LiPoly charging, and an SWD interface.
      </>
    ),
  },
  {
    title: "Image Portfolio v2",
    url: "https://github.com/Hugoyhu/Image-Gallery-v2",
    imageUrl: "/media/ImageGallery.jpg",
    year: 2024,
    description: (
      <>
        A dynamic{" "}
        <a
          href="https://photography.hugohu.me"
          target="_blank"
          rel="noopener noreferrer"
        >
          image gallery
        </a>{" "}
        powered by Cloudinary CDN and MongoDB. Features upload authentication
        and EXIF display.
      </>
    ),
  },
  {
    title: "USB-C Power Delivery Decoy Board",
    url: "https://github.com/Hugoyhu/CYPD3177-Breakout",
    imageUrl: "/media/USBCDecoyBoard.jpg",
    year: 2023,
    description: (
      <>
        A small form-factor Power Delivery sink breakout built for Blot, an
        open-source CNC plotting machine. The design is based off the Cypress
        CYPD-3177 chipset and enables up to 20V@5A from supported power sources.
      </>
    ),
  },
  {
    title: "USB Type-C Hub",
    url: "https://github.com/Hugoyhu/SL2.1A-Type-C-Hub",
    imageUrl: "/media/USBHub.jpg",
    year: 2023,
    description: (
      <>
        A re-design of the 2021
        <a
          href="https://github.com/Hugoyhu/zephyrhub"
          target="_blank"
          rel="noopener noreferrer"
        >
          {" "}
          ZephyrHub{" "}
        </a>
        , this new design has four USB Type-C outputs each operating at up to
        480Mbps, serving as an open-source reference design for the SL2.1A
        chipset.
      </>
    ),
  },
];
