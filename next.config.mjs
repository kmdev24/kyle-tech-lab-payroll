/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit loads its built-in font metrics (js/data/*.afm, js/standard-fonts/*.cjs)
  // from disk at runtime, which the file tracer cannot see,
  // so it must not be bundled by webpack.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/**/*"],
  },
};

export default nextConfig;
