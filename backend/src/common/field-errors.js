// Per-field failures for Admin forms. The shared error middleware sends only a
// code and message, so these responses are written directly.

/** First message per field. Unknown keys are reported under their own name. */
export function zodFieldErrors(issues) {
 const fields = {};
 for (const issue of issues) {
  const paths = issue.code === "unrecognized_keys" ? issue.keys : [issue.path.join(".")];
  for (const path of paths) {
   fields[path] ??= issue.code === "unrecognized_keys" ? "Không được phép thay đổi trường này." : issue.message;
  }
 }
 return fields;
}

export function sendFieldErrors(response, fields, { status = 400, code = "VALIDATION_ERROR", message = "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại." } = {}) {
 return response.status(status).json({ success: false, message, error: { code, fields } });
}
