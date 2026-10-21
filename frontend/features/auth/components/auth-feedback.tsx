import { AuthNotice } from "./auth-notice";

export function AuthFeedback({ failure, notice }: { failure: string; notice: string }) {
  return <>
    {failure && <p role="alert" className="rounded-lg border border-danger p-3 text-sm leading-relaxed text-danger">{failure}</p>}
    <AuthNotice>{notice}</AuthNotice>
  </>;
}
