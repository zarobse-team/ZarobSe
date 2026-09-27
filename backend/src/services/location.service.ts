export type GeocodedLocation = {
	name: string;
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
		latitude: Number(place.lat),
		longitude: Number(place.lon),
		type: place.type,
	}));
};
