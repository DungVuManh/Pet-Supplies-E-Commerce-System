import { publicUser } from "../models/user.model.js";

export function dashboard(request, response) {
 response.json({ success: true, data: { user: publicUser(request.user) } });
}
