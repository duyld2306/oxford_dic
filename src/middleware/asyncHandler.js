// Simple async wrapper to avoid repetitive try/catch in controllers
export default function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
