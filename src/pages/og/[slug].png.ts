import { getCollection } from 'astro:content';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';

export async function GET({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const doctors = await getCollection('doctors');
    const doctor = doctors.find((d) => d.id === slug);

    if (!doctor) return new Response('Not Found', { status: 404 });

    const { fullName, tier, specialty, rankingScore } = doctor.data;

    // Fetch Font (Inter Bold)
    const fontData = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.19/latin-700-normal.woff')
        .then((res) => res.arrayBuffer());

    const markup = html`
        <div style="display: flex; height: 100%; width: 100%; background-color: #0f0f13; color: white; padding: 40px; justify-content: center; align-items: center;">
            <div style="display: flex; flex-direction: column; align-items: center; border: 2px solid ${tier === 'TITAN' ? '#fbbf24' : '#333'}; padding: 40px; border-radius: 20px; background: #1a1b26; width: 100%; height: 100%; justify-content: center;">
                <div style="font-size: 24px; color: #a8a8b3; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">MDRPedia Authority</div>
                <div style="font-size: 64px; font-weight: bold; text-align: center; line-height: 1.1; margin-bottom: 10px;">${fullName}</div>
                <div style="font-size: 32px; color: #a8a8b3; margin-bottom: 40px;">${specialty}</div>
                
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="display: flex; padding: 10px 30px; background: ${tier === 'TITAN' ? '#fbbf24' : '#333'}; color: ${tier === 'TITAN' ? '#000' : '#fff'}; border-radius: 50px; font-size: 32px; font-weight: bold;">
                        ${tier}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                         <div style="font-size: 16px; color: #888;">MDR Score</div>
                         <div style="font-size: 32px; font-weight: bold;">${rankingScore || 0}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const svg = await satori(markup, {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: 'Inter',
                data: fontData,
                style: 'normal',
                weight: 700,
            },
        ],
    });

    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(pngBuffer as any, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}

export async function getStaticPaths() {
    const doctors = await getCollection('doctors');
    return doctors.map((doctor) => ({
        params: { slug: doctor.id },
    }));
}
