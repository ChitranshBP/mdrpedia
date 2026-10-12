import { getCollection } from "astro:content";

export interface RegisterStats {
	profiles: number;
	countries: number;
	specialties: number;
	historical: number;
	tiers: Record<"TITAN" | "ELITE" | "MASTER" | "UNRANKED", number>;
	citations: number;
	withOpenAlex: number;
	withHonours: number;
	withTechniques: number;
	withLineage: number;
}

let cached: RegisterStats | null = null;

/** Register-wide figures, computed from the content collection at build time. */
export async function getRegisterStats(): Promise<RegisterStats> {
	if (cached) return cached;
	const doctors = (await getCollection("doctors")).map((d) => d.data as Record<string, any>);
	const tiers = { TITAN: 0, ELITE: 0, MASTER: 0, UNRANKED: 0 };
	for (const d of doctors) {
		const t = d.tier as keyof typeof tiers;
		tiers[t in tiers ? t : "UNRANKED"]++;
	}
	cached = {
		profiles: doctors.length,
		countries: new Set(doctors.map((d) => d.geography?.country).filter(Boolean)).size,
		specialties: new Set(doctors.map((d) => d.specialty).filter(Boolean)).size,
		historical: doctors.filter((d) => d.status === "HISTORICAL").length,
		tiers,
		citations: doctors.reduce((n, d) => n + (Array.isArray(d.citations) ? d.citations.length : 0), 0),
		withOpenAlex: doctors.filter((d) => d.openalexId).length,
		withHonours: doctors.filter((d) => Array.isArray(d.awards) && d.awards.length > 0).length,
		withTechniques: doctors.filter((d) => Array.isArray(d.techniquesInvented) && d.techniquesInvented.length > 0).length,
		withLineage: doctors.filter((d) => (d.mentors?.length ?? 0) > 0 || (d.students?.length ?? 0) > 0).length,
	};
	return cached;
}

export const fmt = (n: number) => n.toLocaleString("en-US");
