function success(res, message, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, message, err = '', statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: err instanceof Error ? err.message : String(err),
  });
}

module.exports = { success, error };
