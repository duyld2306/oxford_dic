export default function errorHandler(err, req, res, next) {
  // Log error for diagnostics
  console.error("Unhandled error:", err && err.stack ? err.stack : err);

  const status =
    err && err.status && Number(err.status) >= 400 ? Number(err.status) : 500;
  const message = err && err.message ? err.message : "Internal server error";

  if (res && typeof res.apiError === "function") {
    return res.apiError(message, status, err.details || undefined);
  }

  res
    .status(status)
    .json({ success: false, status_code: status, data: null, message });
}
