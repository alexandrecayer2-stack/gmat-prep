import { getDiagnosticQuestions } from '@/lib/data/content';
import { DiagnosticFlow } from '@/components/diagnostic/diagnostic-flow';

export const metadata = {
  title: 'Diagnostic — GMAT Prep',
};

export default async function DiagnosticPage() {
  // Fetch a larger pool than we administer; the adaptive runner serves the most
  // informative subset (≈6 per section).
  const questions = await getDiagnosticQuestions(14);
  return <DiagnosticFlow questions={questions} />;
}
