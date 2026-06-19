import { BookOpen, Target, Zap, type LucideIcon } from 'lucide-react';
import type { Section } from '@/lib/domain/types';

/**
 * Per-section lucide icon, shared by Learn, the Dashboard, and Practice setup so
 * every screen uses the same visual marker for a section.
 */
export const SECTION_ICONS: Record<Section, LucideIcon> = {
  quant: Target,
  verbal: BookOpen,
  data_insights: Zap,
};
