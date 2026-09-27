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

export type StreetSuggestion = {
	name: string;
	fullName: string;
};

const normalizeSearchText = (text: string): string => {
	return text
		.toLocaleLowerCase("pl-PL")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/ł/g, "l");
};

export const searchStreets = async (
	city: string,
	query: string,
	limit = 5,
): Promise<StreetSuggestion[]> => {
	const simcPath = path.join(
		process.cwd(),
		"src",
		"data",
		"SIMC_Urzedowy_2026-09-27.csv",
	);

	const ulicPath = path.join(
		process.cwd(),
		"src",
		"data",
		"ULIC_Urzedowy_2026-09-27.csv",
	);

	const simc = fs.readFileSync(simcPath, "utf-8");
	const ulic = fs.readFileSync(ulicPath, "utf-8");

	const simcLines = simc.split(/\r?\n/);
	const ulicLines = ulic.split(/\r?\n/);

	const normalizedCity = normalizeSearchText(city.trim());
	const normalizedQuery = normalizeSearchText(query.trim());

	if (!normalizedCity || !normalizedQuery) {
		return [];
	}

	/*
	 * Znajdujemy główne miasto w SIMC.
	 *
	 * RM = 96 oznacza miasto.
	 */
	const cityRecord = simcLines
		.slice(1)
		.map((line) => line.split(";"))
		.find((columns) => {
			const name = columns[6]?.trim();
			const rm = columns[4]?.trim();

			return (
				name && normalizeSearchText(name) === normalizedCity && rm === "96"
			);
		});

	if (!cityRecord) {
		return [];
	}

	const woj = cityRecord[0]?.trim();
	const pow = cityRecord[1]?.trim();

	/*
	 * Zbieramy SYM głównego miasta oraz SYM jednostek
	 * pomocniczych miasta.
	 *
	 * Dla Krakowa są to m.in.:
	 * 0950470 - Kraków-Krowodrza
	 * 0950718 - Kraków-Nowa Huta
	 * 0950960 - Kraków-Podgórze
	 * 0951327 - Kraków-Śródmieście
	 */
	const citySyms = new Set<string>();

	const mainCitySym = cityRecord[7]?.trim();

	if (mainCitySym) {
		citySyms.add(mainCitySym);
	}

	for (const line of simcLines.slice(1)) {
		const columns = line.split(";");

		const recordWoj = columns[0]?.trim();
		const recordPow = columns[1]?.trim();
		const recordRm = columns[4]?.trim();
		const sym = columns[7]?.trim();

		if (recordWoj === woj && recordPow === pow && recordRm === "98" && sym) {
			citySyms.add(sym);
		}
	}

	const results: StreetSuggestion[] = [];
	const uniqueNames = new Set<string>();

	/*
	 * Szukamy ulic w ULIC należących do znalezionych
	 * jednostek miasta.
	 */
	for (const line of ulicLines.slice(1)) {
		const columns = line.split(";");

		const sym = columns[4]?.trim();
		const cecha = columns[6]?.trim();
		const nazwa1 = columns[7]?.trim();
		const nazwa2 = columns[8]?.trim();

		if (!sym || !nazwa1) {
			continue;
		}

		if (!citySyms.has(sym)) {
			continue;
		}

		const streetName = nazwa2 ? `${nazwa1} ${nazwa2}`.trim() : nazwa1;

		if (!normalizeSearchText(streetName).startsWith(normalizedQuery)) {
			continue;
		}

		const normalizedName = streetName.toLocaleLowerCase("pl-PL");

		if (uniqueNames.has(normalizedName)) {
			continue;
		}

		uniqueNames.add(normalizedName);

		results.push({
			name: streetName,
			fullName: cecha ? `${cecha} ${streetName}` : streetName,
		});
	}

	results.sort((a, b) => a.name.localeCompare(b.name, "pl-PL"));

	return results.slice(0, limit);
};
