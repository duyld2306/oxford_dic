// Response middleware: all responses are wrapped in a data object
export default function responseHandler(req, res, next) {
  res.apiSuccess = function (payload = null, status = 200) {
    const envelope = {
      success: true,
      status_code: status,
      data: null,
      meta: null,
      message: "",
      error_code: "",
    };

    // Support new payload shape: { data?, meta?, message? }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const hasDataKey = Object.prototype.hasOwnProperty.call(payload, "data");
      const hasMetaKey = Object.prototype.hasOwnProperty.call(payload, "meta");
      const hasMessageKey = Object.prototype.hasOwnProperty.call(
        payload,
        "message"
      );

      if (hasMessageKey && payload.message) {
        envelope.message = payload.message;
      }

      if (hasDataKey) {
        envelope.data = payload.data === undefined ? null : payload.data;
      }

      if (hasMetaKey) {
        envelope.meta = payload.meta === undefined ? null : payload.meta;
      }

      // Backward compatibility: if payload has no data/meta keys, treat previous behavior
      if (!hasDataKey && !hasMetaKey) {
        // Extract message if provided, wrap everything else in data
        if (payload.message) envelope.message = payload.message;

        const { message, ...dataContent } = payload;
        envelope.data =
          Object.keys(dataContent).length > 0 ? dataContent : null;
      }
    } else {
      envelope.data = payload;
    }

    res.status(status).json(envelope);
  };

  res.apiError = function (
    message = "Internal server error",
    status = 500,
    errorCode = ""
  ) {
    const envelope = {
      success: false,
      status_code: status,
      data: null,
      message: message || "Internal server error",
      error_code: errorCode || "",
    };
    res.status(status).json(envelope);
  };

  next();
}
