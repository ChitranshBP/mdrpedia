import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
    doctorName: string;
    mentors: string[]; // Names of mentors
    students: string[]; // Names of students
}

export default function MedicalLineageGraph({ doctorName, mentors, students }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Clear previous
        d3.select(svgRef.current).selectAll("*").remove();

        const width = 600;
        const height = 400;
        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("background", "transparent")
            .style("overflow", "visible");

        // Data Structure
        const data = {
            name: doctorName,
            type: 'self',
            children: [
                {
                    name: 'Mentors',
                    children: mentors.length ? mentors.map(m => ({ name: m, type: 'mentor' })) : [{ name: 'Unknown', type: 'placeholder' }]
                },
                {
                    name: 'Students',
                    children: students.length ? students.map(s => ({ name: s, type: 'student' })) : [{ name: 'None recorded', type: 'placeholder' }]
                }
            ]
        };

        const root = d3.hierarchy(data);
        const treeLayout = d3.tree().size([height - 100, width - 200]);
        treeLayout(root);

        // Links
        svg.selectAll('path.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x((d: any) => d.y + 100)
                .y((d: any) => d.x + 50) as any
            )
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-width', 1.5);

        // Nodes
        const nodes = svg.selectAll('g.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', (d: any) => `translate(${d.y + 100},${d.x + 50})`);

        // Circles
        nodes.append('circle')
            .attr('r', (d: any) => d.data.type === 'self' ? 10 : 6)
            .style('fill', (d: any) => {
                if (d.data.type === 'self') return '#8b5cf6'; // Purple
                if (d.data.type === 'mentor') return '#3b82f6'; // Blue
                if (d.data.type === 'student') return '#10b981'; // Green
                return '#6b7280'; // Gray
            })
            .style('stroke', '#fff')
            .style('stroke-width', 2);

        // Labels
        nodes.append('text')
            .attr('dy', (d: any) => d.children ? -15 : 4)
            .attr('dx', (d: any) => d.children ? 0 : 12)
            .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
            .text((d: any) => d.data.name)
            .style('font-size', '12px')
            .style('fill', '#fff')
            .style('font-family', 'Inter, sans-serif')
            .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');

    }, [doctorName, mentors, students]);

    return (
        <div className="lineage-graph-container bg-[#0f0f13] border border-white/10 rounded-xl p-4 overflow-hidden">
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-2 text-center text-white/50">Surgical Pedigree</h3>
            <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
    );
}
