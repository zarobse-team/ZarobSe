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
	const url = new URL("https://nominatim.openstreetmap.org/search");

	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("countrycodes", "pl");
	url.searchParams.set("addressdetails", "1");
	url.searchParams.set("featuretype", "settlement");

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

	const cities: CitySuggestion[] = data
		.map(
			(place: any): CitySuggestion => ({
				name:
					place.address?.city ||
					place.address?.town ||
					place.address?.village ||
					place.name ||
					"",
				latitude: Number(place.lat),
				longitude: Number(place.lon),
			}),
		)
		.filter((place: CitySuggestion) =>
			place.name.toLowerCase().startsWith(query.toLowerCase()),
		);

	const uniqueCities: CitySuggestion[] = [];

	for (const city of cities) {
		if (
			!uniqueCities.some(
				(item) => item.name.toLowerCase() === city.name.toLowerCase(),
			)
		) {
			uniqueCities.push(city);
		}
	}

	return uniqueCities;
};
