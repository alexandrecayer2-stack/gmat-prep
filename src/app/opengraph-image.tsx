import { ImageResponse } from 'next/og';

// Social share card, rendered on demand (no static asset needed). Applies to
// every route via the App Router file convention; the root URL — the one people
// actually paste into messages and social — is what this makes look good.
export const alt = 'GMAT Prep - predict your GMAT Focus score, free';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ASCII-only copy on purpose: the default ImageResponse font renders basic latin
// reliably; fancy glyphs (arrows, em-dashes, middots) can drop out.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0e1a',
          backgroundImage: 'linear-gradient(135deg, #0a0e1a 0%, #211a4d 55%, #3b1e63 100%)',
          padding: '72px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: '26px', letterSpacing: '3px', color: '#a5b4fc' }}>
          GMAT FOCUS EDITION
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: '72px', fontWeight: 700, lineHeight: 1.05, maxWidth: '960px' }}>
            Predict your GMAT score before you sit the exam
          </div>
          <div style={{ display: 'flex', marginTop: '28px', fontSize: '30px', color: '#c7cbd4', maxWidth: '860px' }}>
            A free 15-minute adaptive diagnostic. Your predicted score, plus a study plan.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: '26px', color: '#e5e7eb' }}>
            1,400+ questions   |   3 sections   |   instant explanations
          </div>
          <div style={{ display: 'flex', fontSize: '24px', color: '#818cf8' }}>gmat-prep-nine.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
