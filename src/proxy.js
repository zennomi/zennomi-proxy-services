const { proxy } = require("fast-proxy")({
  cacheURLs: 0,
  requests: {
    http: require("follow-redirects/http"),
    https: require("follow-redirects/https"),
  },
});

const ALLOWED_ORIGIN = [
  /localhost/,
  /192\.168\.100/,
  /zennomi-services\.onrender\.com/,
  /zenno\.moe/,
  /cors-manga\.web\.app/,
]

const INJECTED_STATUS_HEADER = "x-content-retrieved";

const rewriteRequestHeadersHandler = (header) => {
  return (req, headers) => {
    const requestHeaders = { ...headers, referer: header };
    delete requestHeaders["x-forwarded-host"];
    return requestHeaders;
  };
};

const rewriteV2RequestHeadersHandler = (header) => {
  return (req, headers) => {
    const requestHeaders = { ...headers, "origin": "cubari", "x-requested-with": "cubari" };
    delete requestHeaders["x-forwarded-host"];
    return requestHeaders;
  };
};

const rewriteHeadersHandler = (successCheck, headerFilterPredicate) => {
  return (headers) => {
    if (!successCheck(headers)) {
      return {
        [INJECTED_STATUS_HEADER]: false,
      };
    } else {
      return Object.entries(headers)
        .filter(headerFilterPredicate)
        .reduce((accumulator, [key, value]) => {
          accumulator[key] = value;
          return accumulator;
        }, {});
    }
  };
};

const onResponseHandler = (errorMsg, reply, cacheHeaders) => {
  return (req, res, stream) => {
    if (INJECTED_STATUS_HEADER in res.getHeaders()) {
      reply.code(400).send(new Error(errorMsg));
    } else if (res.statusCode !== 200) {
      reply
        .code(res.statusCode)
        .send(new Error(`Requested content returned ${res.statusCode}`));
    } else {
      if (cacheHeaders) {
        reply.header("cache-control", cacheHeaders);
      }
      reply.send(stream);
    }
  };
};

module.exports = {
  proxy,
  rewriteRequestHeadersHandler,
  rewriteV2RequestHeadersHandler,
  rewriteHeadersHandler,
  onResponseHandler,
  ALLOWED_ORIGIN,
};
