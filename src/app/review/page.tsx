import { ReviewView } from '@/components/review/review-view';

export const metadata = {
  title: 'Review — GMAT Prep',
  description:
    'Review your GMAT Focus attempts: filter your history, redo missed questions with explanations, and track spaced repetition.',
};

export default function ReviewPage() {
  return <ReviewView />;
}
