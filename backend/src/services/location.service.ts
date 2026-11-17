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

	console.log("Nominatim request:", url.toString());

	let response: Response;

	try {
		response = await fetch(url, {
			headers: {
				"User-Agent": "ZarobSe/1.0",
				Accept: "application/json",
			},
		});

		console.log("Nominatim response status:", response.status);
	} catch (error) {
		console.error("Nominatim connection error:", error);
		throw error;
	}

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

type SimcRecord = {
	name: string;
	normalizedName: string;
	rm: string;
	woj: string;
	pow: string;
	sym: string;
};

type CachedStreet = StreetSuggestion & {
	normalizedName: string;
};

type IndexedCity = CitySuggestion & {
	normalizedName: string;
	isCity: boolean;
};

type GusCache = {
	cities: SimcRecord[];
	citySearchIndex: IndexedCity[];
	streetsBySym: Map<string, CachedStreet[]>;
	cityStreets: Map<string, CachedStreet[]>;
};

let gusCache: GusCache | null = null;

const getGusData = (): GusCache => {
	if (gusCache) {
		return gusCache;
	}

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

	const cities: SimcRecord[] = [];
	const streetsBySym = new Map<string, CachedStreet[]>();

	const simcLines = simc.split(/\r?\n/);

	for (let i = 1; i < simcLines.length; i++) {
		const columns = simcLines[i].split(";");

		const name = columns[6]?.trim();

		if (!name) {
			continue;
		}

		cities.push({
			name,
			normalizedName: normalizeSearchText(name),
			rm: columns[4]?.trim() || "",
			woj: columns[0]?.trim() || "",
			pow: columns[1]?.trim() || "",
			sym: columns[7]?.trim() || "",
		});
	}

	const ulicLines = ulic.split(/\r?\n/);

	for (let i = 1; i < ulicLines.length; i++) {
		const columns = ulicLines[i].split(";");

		const sym = columns[4]?.trim();
		const cecha = columns[6]?.trim();
		const nazwa1 = columns[7]?.trim();
		const nazwa2 = columns[8]?.trim();

		if (!sym || !nazwa1) {
			continue;
		}

		const streetName = nazwa2 ? `${nazwa1} ${nazwa2}`.trim() : nazwa1;

		const street: CachedStreet = {
			name: streetName,
			fullName: cecha ? `${cecha} ${streetName}` : streetName,
			normalizedName: normalizeSearchText(streetName),
		};

		const streets = streetsBySym.get(sym) || [];
		streets.push(street);
		streetsBySym.set(sym, streets);
	}

	// Przygotowanie indeksu unikalnych miejscowości.
	// Wykonuje się tylko raz podczas ładowania danych GUS.
	const uniqueCities = new Map<string, IndexedCity>();

	for (const city of cities) {
		const key = city.name.toLocaleLowerCase("pl-PL");
		const existing = uniqueCities.get(key);
		const isCity = city.rm === "96";

		if (existing) {
			if (isCity) {
				existing.isCity = true;
			}

			continue;
		}

		uniqueCities.set(key, {
			name: city.name,
			normalizedName: key,
			latitude: 0,
			longitude: 0,
			isCity,
		});
	}

	const citySearchIndex = [...uniqueCities.values()];

	citySearchIndex.sort((a, b) => {
		if (a.isCity && !b.isCity) return -1;
		if (!a.isCity && b.isCity) return 1;

		return a.name.localeCompare(b.name, "pl");
	});

	gusCache = {
		cities,
		citySearchIndex,
		streetsBySym,
		cityStreets: new Map<string, CachedStreet[]>(),
	};

	console.log(
		`GUS cache loaded: ${cities.length} miejscowości, ` +
			`${ulicLines.length - 1} wierszy ULIC, ` +
			`${citySearchIndex.length} unikalnych nazw`,
	);

	return gusCache;
};

export const searchCities = async (
	query: string,
	limit = 5,
): Promise<CitySuggestion[]> => {
	const { citySearchIndex } = getGusData();

	const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");

	if (!normalizedQuery || limit <= 0) {
		return [];
	}

	const results: CitySuggestion[] = [];

	for (const city of citySearchIndex) {
		if (!city.normalizedName.startsWith(normalizedQuery)) {
			continue;
		}

		results.push({
			name: city.name,
			latitude: city.latitude,
			longitude: city.longitude,
		});

		if (results.length >= limit) {
			break;
		}
	}

	return results;
};

const getStreetsForCity = (
	cityName: string,
	cache: GusCache,
): CachedStreet[] => {
	const normalizedCity = normalizeSearchText(cityName.trim());

	const cachedStreets = cache.cityStreets.get(normalizedCity);

	if (cachedStreets) {
		return cachedStreets;
	}

	const cityRecord = cache.cities.find(
		(record) => record.normalizedName === normalizedCity && record.rm === "96",
	);

	if (!cityRecord) {
		return [];
	}

	const citySyms = new Set<string>();

	if (cityRecord.sym) {
		citySyms.add(cityRecord.sym);
	}

	// Uwzględniamy jednostki pomocnicze miasta (RM = 98).
	for (const record of cache.cities) {
		if (
			record.woj === cityRecord.woj &&
			record.pow === cityRecord.pow &&
			record.rm === "98" &&
			record.sym
		) {
			citySyms.add(record.sym);
		}
	}

	const results: CachedStreet[] = [];
	const uniqueNames = new Set<string>();

	for (const sym of citySyms) {
		const streets = cache.streetsBySym.get(sym) || [];

		for (const street of streets) {
			if (uniqueNames.has(street.normalizedName)) {
				continue;
			}

			uniqueNames.add(street.normalizedName);
			results.push(street);
		}
	}

	results.sort((a, b) => a.name.localeCompare(b.name, "pl"));

	cache.cityStreets.set(normalizedCity, results);

	return results;
};

export const searchStreets = async (
	city: string,
	query: string,
	limit = 5,
): Promise<StreetSuggestion[]> => {
	const normalizedCity = normalizeSearchText(city.trim());
	const normalizedQuery = normalizeSearchText(query.trim());

	if (!normalizedCity || !normalizedQuery) {
		return [];
	}

	const cache = getGusData();
	const streets = getStreetsForCity(city, cache);

	const results: StreetSuggestion[] = [];

	for (const street of streets) {
		if (!street.normalizedName.startsWith(normalizedQuery)) {
			continue;
		}

		results.push({
			name: street.name,
			fullName: street.fullName,
		});

		if (results.length >= limit) {
			break;
		}
	}

	return results;
};
