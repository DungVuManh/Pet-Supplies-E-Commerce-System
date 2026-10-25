import { TextField } from "@/components/ui/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import type { AuthErrors } from "../validation";

export function ProfileFields({ errors, prefix }: { errors: AuthErrors; prefix: string }) {
  return <>
    <TextField id={`${prefix}-name`} name="fullName" label="Họ và tên" placeholder="Nhập họ và tên của bạn" autoComplete="name" maxLength={100} required error={errors.fullName} />
    <TextField id={`${prefix}-phone`} name="phone" label="Số điện thoại" type="tel" placeholder="Nhập số điện thoại" autoComplete="tel" maxLength={20} required error={errors.phone} />
  </>;
}

export function TermsCheckbox({ error, id }: { error?: string; id: string }) {
  return <Checkbox id={id} name="terms" required error={error}>
    Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của Petjoy.
  </Checkbox>;
}
