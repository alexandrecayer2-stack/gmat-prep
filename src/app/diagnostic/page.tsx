import { getDiagnosticQuestions } from '@/lib/data/content';
import { DiagnosticFlow } from '@/components/diagnostic/diagnostic-flow';

export const metadata = {
  title: 'Diagnostic — GMAT Prep',
};

export default async function DiagnosticPage() {
  const questions = await getDiagnosticQuestions(5);
  return <DiagnosticFlow questions={questions} />;
}
