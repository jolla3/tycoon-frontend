'use client';

// Renders authoritative legal content from Resources without rewriting meaning.

import type { ReactNode } from 'react';
import { Box, Container, Divider, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';
import { appConfig } from '@/config/app';

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocumentContent {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: readonly LegalSection[];
}

function renderBlock(text: string, key: string) {
  const lines = text.split('\n');
  const isList = lines.every((l) => l.trim() === '' || l.trim().startsWith('* ') || l.trim().startsWith('- '));
  if (isList) {
    return (
      <Box component="ul" key={key} sx={{ pl: 3, mb: 2 }}>
        {lines
          .filter((l) => l.trim())
          .map((l, i) => (
            <Typography component="li" key={i} variant="body1" sx={{ mb: 0.75, lineHeight: 1.7 }}>
              {formatInline(l.replace(/^\*\s+/, '').replace(/^-\s+/, ''))}
            </Typography>
          ))}
      </Box>
    );
  }
  return (
    <Typography key={key} variant="body1" paragraph sx={{ lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
      {formatInline(text)}
    </Typography>
  );
}

function formatInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith('**')) {
      parts.push(
        <Box component="strong" key={`b${i++}`}>
          {m[0].slice(2, -2)}
        </Box>
      );
    } else {
      parts.push(
        <MuiLink key={`a${i++}`} href={m[3]} target="_blank" rel="noopener noreferrer">
          {m[2]}
        </MuiLink>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export function LegalDocument({ content }: { content: LegalDocumentContent }) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, '@media print': { py: 2 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700 }}>
        {content.title}
      </Typography>
      {content.lastUpdated ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {content.lastUpdated}
        </Typography>
      ) : null}
      {content.intro
        ? content.intro.split(/\n\n+/).map((p, i) => (
            <Typography key={i} variant="body1" paragraph sx={{ lineHeight: 1.75 }}>
              {formatInline(p)}
            </Typography>
          ))
        : null}
      <Divider sx={{ my: 3 }} />
      {content.sections.map((section) => (
        <Box key={section.heading} component="section" sx={{ mb: 4 }} id={section.heading.replace(/[^\w]+/g, '-').toLowerCase()}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
            {section.heading}
          </Typography>
          {section.paragraphs.map((p, i) => renderBlock(p, `${section.heading}-${i}`))}
        </Box>
      ))}
      <Divider sx={{ my: 4 }} />
      <Typography variant="body2" color="text.secondary">
        <MuiLink component={Link} href="/">
          {appConfig.name}
        </MuiLink>
        {' · '}
        <MuiLink component={Link} href="/privacy">
          Privacy Policy
        </MuiLink>
        {' · '}
        <MuiLink component={Link} href="/terms">
          Terms of Service
        </MuiLink>
      </Typography>
    </Container>
  );
}
