import { sendPreview } from "@/help/linear.ts";
import { pickIssueForPreview } from "@/prompts/linear";

export default async function handle() {
  const { issue, attachment } = await pickIssueForPreview();
  await sendPreview(issue, attachment);
}
