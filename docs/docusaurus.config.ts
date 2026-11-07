import type * as Preset from "@docusaurus/preset-classic";
import * as path from "node:path";
import type { Config, PluginConfig } from "@docusaurus/types";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

// Independent development-only preview; no stable GoreeCloud release is implied.

const config: Config = {
  title: "GoreeCloud Home Security",
  tagline: "Self-hosted home monitoring — development preview",
  // Fail closed: do not generate public GoreeCloud doc URLs until an approved docs host exists.
  url: "http://localhost",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/branding/favicon.ico",
  organizationName: "GoreeCloud",
  projectName: "home-security",
  themes: [
    "@docusaurus/theme-mermaid",
    "docusaurus-theme-openapi-docs",
  ],
  markdown: {
    mermaid: true,
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    localeConfigs: {
      en: {
        label: "English",
      },
    },
  },
  themeConfig: {
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    prism: {
      magicComments: [
        {
          className: "theme-code-block-highlighted-line",
          line: "highlight-next-line",
          block: { start: "highlight-start", end: "highlight-end" },
        },
        {
          className: "code-block-error-line",
          line: "highlight-error-line",
        },
      ],
      additionalLanguages: ["bash", "json"],
    },
    languageTabs: [
      {
        highlight: "python",
        language: "python",
        logoClass: "python",
      },
      {
        highlight: "javascript",
        language: "nodejs",
        logoClass: "nodejs",
      },
      {
        highlight: "javascript",
        language: "javascript",
        logoClass: "javascript",
      },
      {
        highlight: "bash",
        language: "curl",
        logoClass: "curl",
      },
      {
        highlight: "rust",
        language: "rust",
        logoClass: "rust",
      },
    ],
    navbar: {
      title: "GoreeCloud Home Security",
      logo: {
        alt: "GoreeCloud Home Security",
        src: "img/branding/logo.svg",
        srcDark: "img/branding/logo-dark.svg",
      },
      items: [
        {
          to: "/",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        {
          href: "https://github.com/GoreeCloud/home-security",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://goreecloud.com",
          label: "GoreeCloud",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Project",
          items: [
            {
              label: "GoreeCloud Home Security",
              href: "https://github.com/GoreeCloud/home-security",
            },
            {
              label: "Upstream Frigate NVR (attribution)",
              href: "https://github.com/blakeblackshear/frigate",
            },
          ],
        },
      ],
      copyright: `GoreeCloud Home Security documentation preview. Source based on Frigate NVR; original © ${new Date().getFullYear()} Frigate, Inc. (MIT).`,
    },
  },
  plugins: [
    path.resolve(__dirname, "plugins", "raw-loader"),
    path.resolve(__dirname, "plugins", "yaml-loader"),
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "openapi",
        docsPluginId: "classic", // configured for preset-classic
        config: {
          frigateApi: {
            specPath: "static/frigate-api.yaml",
            outputDir: "docs/integrations/api",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
              sidebarCollapsible: true,
              sidebarCollapsed: true,
            },
            showSchemas: true,
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ] as PluginConfig[],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          editUrl:
            "https://github.com/GoreeCloud/home-security/edit/main/docs/",
          sidebarCollapsible: false,
          docItemComponent: "@theme/ApiItem", // Derived from docusaurus-theme-openapi
        },

        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
};

export default async function createConfig() {
  return config;
}
