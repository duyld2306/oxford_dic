export default function errorHandler(err, req, res, next) {
  // Log error for diagnostics
  console.error("Unhandled error:", err && err.stack ? err.stack : err);

  const status =
    err && err.status && Number(err.status) >= 400 ? Number(err.status) : 500;
  const message = err && err.message ? err.message : "Internal server error";

  res.status(status).json({ success: false, error: message });
}
