/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit reads its built-in font metrics (.afm) from disk at runtime,
  // so it must not be bundled by webpack.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
