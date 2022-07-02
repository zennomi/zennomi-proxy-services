const {
  getRefererHeader,
  getCacheHeaders,
} = require("../../utils");
const {
  proxy,
  rewriteV2RequestHeadersHandler,
  rewriteHeadersHandler,
  onResponseHandler,
  ALLOWED_ORIGIN,
} = require("../../proxy");

const V2_CORS_URL = "https://services.f-ck.me"

async function routes(fastify, options) {
  fastify.register(require("fastify-cors"), {
    origin: ALLOWED_ORIGIN,
  });

  const callback = (request, reply) => {
    const decodedUrl = `${V2_CORS_URL}/v2/cors/${request.params.url}`;
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
      rewriteRequestHeaders: rewriteV2RequestHeadersHandler(header),
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
    prefix: "/v2/cors",
  },
};
