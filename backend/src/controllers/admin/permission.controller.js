import { PERMISSIONS } from "../../common/permissions.js";
import { User } from "../../models/user.model.js";

/** The fixed access matrix plus the number of accounts per role. Read-only: permissions are set in code. */
export async function listPermissions(_request, response) {
 const [customer, staff, admin] = await Promise.all(
  ["customer", "staff", "admin"].map((role) => User.countDocuments({ role })),
 );
 response.json({
  success: true,
  data: {
   items: PERMISSIONS.map(({ id, label, roles }) => ({ id, label, roles })),
   counts: { customer, staff, admin },
  },
 });
}
