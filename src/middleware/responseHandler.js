// Minimal response middleware: controllers decide payload shape (including any meta)
// Middleware only provides a uniform envelope and helper functions.
export default function responseHandler(req, res, next) {
  res.apiSuccess = function (payload = null, status = 200) {
    const envelope = {
      success: true,
      status_code: status,
      data: null,
      message: "",
    };

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      // Controller-provided keys (data, meta, etc.) are preserved at top-level
      Object.assign(envelope, payload);
    } else {
      envelope.data = payload;
    }

    res.status(status).json(envelope);
  };

  res.apiError = function (
    message = "Internal server error",
    status = 500,
    details
  ) {
    const envelope = {
      success: false,
      status_code: status,
      data: null,
      message: message || "Internal server error",
    };
    if (details && typeof details === "object") envelope.details = details;
    res.status(status).json(envelope);
  };

  next();
}
