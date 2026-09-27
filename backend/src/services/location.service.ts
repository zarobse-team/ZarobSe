import fs from "fs";
import path from "path";

export type GeocodedLocation = {
	name: string;
	city: string;
	street: string;
	latitude: number;
	longitude: number;
	type: string;
};

export const searchLocations = async (
	query: string,
	limit = 5,
): Promise<GeocodedLocation[]> => {
	const url = new URL("https://nominatim.openstreetmap.org/search");

	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("countrycodes", "pl");
	url.searchParams.set("addressdetails", "1");

	const response = await fetch(url, {
		headers: {
			"User-Agent": "ZarobSe/1.0",
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Nominatim error: ${response.status} ${response.statusText}`,
		);
	}

	const data = await response.json();

	return data.map((place: any) => ({
		name: place.display_name,
		city:
			place.address?.city ||
			place.address?.town ||
			place.address?.village ||
			place.address?.municipality ||
			"",
		street: place.address?.road || "",
		latitude: Number(place.lat),
		longitude: Number(place.lon),
		type: place.type,
	}));
};

export type CitySuggestion = {
	name: string;
	latitude: number;
	longitude: number;
};

export const searchCities = async (
	query: string,
	limit = 5,
): Promise<CitySuggestion[]> => {
	const simcPath = path.join(
		process.cwd(),
		"src",
		"data",
		"SIMC_Urzedowy_2026-09-27.csv",
	);

	const csv = fs.readFileSync(simcPath, "utf-8");
	const lines = csv.split(/\r?\n/);

	const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");

	const uniqueNames = new Set<string>();

	const results: (CitySuggestion & { isCity: boolean })[] = [];

	for (let i = 1; i < lines.length; i++) {
		const columns = lines[i].split(";");

		const rm = columns[4]?.trim();
		const name = columns[6]?.trim();

		if (!name) {
			continue;
		}

		if (!name.toLocaleLowerCase("pl-PL").startsWith(normalizedQuery)) {
			continue;
		}

		const normalizedName = name.toLocaleLowerCase("pl-PL");

		// Jeżeli ta nazwa już istnieje, ale obecny rekord jest miastem,
		// nadajemy mu pierwszeństwo.
		const existingIndex = results.findIndex(
			(item) => item.name.toLocaleLowerCase("pl-PL") === normalizedName,
		);

		const isCity = rm === "96";

		if (existingIndex !== -1) {
			if (isCity) {
				results[existingIndex].isCity = true;
			}

			continue;
		}

		uniqueNames.add(normalizedName);

		results.push({
			name,
			latitude: 0,
			longitude: 0,
			isCity,
		});
	}

	results.sort((a, b) => {
		if (a.isCity && !b.isCity) return -1;
		if (!a.isCity && b.isCity) return 1;

		return a.name.localeCompare(b.name, "pl");
	});

	return results.slice(0, limit).map(({ isCity, ...city }) => city);
};
