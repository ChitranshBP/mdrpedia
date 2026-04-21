/**
 * Generate default OG image for MDRPedia (1200x630)
 * Run: node scripts/generate-og-default.mjs
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';

const fontData = await fetch(
    'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.19/latin-700-normal.woff'
).then(r => r.arrayBuffer());

const svg = await satori(
    {
        type: 'div',
        props: {
            style: {
                width: '1200px',
                height: '630px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f5f3ee 0%, #eae6dd 100%)',
                fontFamily: 'Inter',
                position: 'relative',
            },
            children: [
                {
                    type: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            border: '3px solid rgba(0,0,0,0.06)',
                        },
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '72px',
                            fontWeight: '700',
                            color: '#1a1a2e',
                            letterSpacing: '-2px',
                            marginBottom: '8px',
                        },
                        children: 'MDRPedia',
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '22px',
                            fontWeight: '700',
                            color: '#666',
                            letterSpacing: '6px',
                            textTransform: 'uppercase',
                            marginBottom: '40px',
                        },
                        children: "The Physicians' Register",
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            width: '80px',
                            height: '1px',
                            background: '#1a1a2e',
                            marginBottom: '40px',
                        },
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '18px',
                            color: '#888',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                        },
                        children: 'An independently-verified encyclopedia of physicians worldwide',
                    },
                },
            ],
        },
    },
    {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: 'Inter',
                data: fontData,
                weight: 700,
                style: 'normal',
            },
        ],
    }
);

const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
});

const png = resvg.render().asPng();
writeFileSync('public/og-default.png', png);
console.log('Generated public/og-default.png (1200x630)');
