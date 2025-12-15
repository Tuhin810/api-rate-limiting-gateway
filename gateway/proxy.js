const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy options
const options = {
  target: process.env.BACKEND_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    // Preserve path or rewrite? Requirements say "Proxy requests to downstream services".
    // Usually Gateway /api/foo -> Service /api/foo.
    // We will keep it simple.
  },
  onProxyReq: (proxyReq, req, res) => {
    // Preserve headers is default in http-proxy-middleware
    // We can inject user info if needed
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
    }
  }
};

const proxy = createProxyMiddleware(options);

module.exports = proxy;
