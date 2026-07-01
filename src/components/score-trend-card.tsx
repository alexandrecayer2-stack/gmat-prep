'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getScoreTrend, type ScoreTrendPoint } from '@/lib/data/attempts';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

export function ScoreTrendCard() {
  const { user, loading, supabase } = useAuth();
  const [points, setPoints] = useState<ScoreTrendPoint[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getScoreTrend(supabase, user.id)
      .then((p) => active && setPoints(p))
      .catch((e) => {
        console.error('Failed to load score trend:', e);
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  // A trend needs at least two points to be meaningful.
  if (!points || points.length < 2) return null;

  const first = points[0].total;
  const last = points[points.length - 1].total;
  const delta = last - first;
  const lo = Math.min(...points.map((p) => p.total));
  const hi = Math.max(...points.map((p) => p.total));
  // Pad the y-domain a little and snap to the 10-pt grid for a stable axis.
  const yMin = Math.max(205, Math.floor((lo - 20) / 10) * 10);
  const yMax = Math.min(805, Math.ceil((hi + 20) / 10) * 10);

  const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendClass = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted-foreground';

  return (
    <Card className="animate-fade-in-up p-5">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel as="div">Predicted score over time</SectionLabel>
        <span className={`inline-flex items-center gap-1 text-sm font-medium ${trendClass}`}>
          <Trend className="size-4" />
          {delta > 0 ? '+' : ''}
          {delta} pts
        </span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="n"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              label={{ value: 'questions answered', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(n) => `After ${n} questions`}
              formatter={(v) => [v as number, 'Predicted']}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--primary)' }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Your estimate as it moved from {first} to {last} over {points[points.length - 1].n} answered
        questions.
      </p>
    </Card>
  );
}
