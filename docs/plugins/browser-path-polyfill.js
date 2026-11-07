"use strict";

// Compatibility shim for imported OpenAPI code-generation examples that
// reference node:path in a browser bundle. This intentionally does not
// polyfill filesystem, process, crypto, or other privileged Node modules.
// The imported Docusaurus site is a localhost-only development preview.
module.exports = function goreecloudBrowserPathCompat() {
  return {
    name: "goreecloud-browser-path-compat",
    configureWebpack(_config, isServer) {
      if (isServer) return {};
      return {
        resolve: {
          fallback: {
            path: require.resolve("path-browserify"),
          },
        },
      };
    },
  };
};
