const {
  getRefererHeader,
  base64UrlDecode,
  normalizeUrl,
  getCacheHeaders,
} = require("../../utils");
const {
  proxy,
  rewriteRequestHeadersHandler,
  rewriteHeadersHandler,
  onResponseHandler,
  ALLOWED_ORIGIN,
} = require("../../proxy");

async function routes(fastify, options) {
  fastify.register(require("fastify-cors"), {
    origin: ALLOWED_ORIGIN,
  });

  const callback = (request, reply) => {
    const decodedUrl = normalizeUrl(base64UrlDecode(request.params.url));
    const header = getRefererHeader(request.url, decodedUrl);

    console.log(decodedUrl);
    if (
      !("origin" in request.headers) &&
      !("x-requested-with" in request.headers)
    ) {
      return reply
        .code(400)
        .send(new Error("Missing origin or x-requested-with header."));
    }

    return proxy(request.raw, reply.raw, decodedUrl, {
      rewriteRequestHeaders: rewriteRequestHeadersHandler(header),
      rewriteHeaders: rewriteHeadersHandler(
        (headers) => !(headers["content-type"] || "").startsWith("image"),
        ([key, _]) => key.toLowerCase().startsWith("content")
      ),
      onResponse: onResponseHandler(
        "Requested content was an image.",
        reply,
        getCacheHeaders("public", 30, 30)
      ),
      request: {
        timeout: fastify.initialConfig.connectionTimeout,
      },
    });
  };

  fastify.get("/:url", callback);
  fastify.post("/:url", callback);
}

module.exports = {
  routes,
  opts: {
    prefix: "/v1/cors",
  },
};
