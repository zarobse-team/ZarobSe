import { Router } from "express";

const router = Router();

router.get("/search", async (req, res) => {
	try {
		const query = String(req.query.q ?? "").trim();

		if (!query) {
			return res.status(400).json({
				message: "Podaj miejscowość do wyszukania.",
			});
		}

		const url = new URL("https://nominatim.openstreetmap.org/search");

		url.searchParams.set("q", query);
		url.searchParams.set("format", "json");
		url.searchParams.set("limit", "5");
		url.searchParams.set("countrycodes", "pl");
		url.searchParams.set("addressdetails", "1");

		const response = await fetch(url, {
			headers: {
				"User-Agent": "ZarobSe/1.0",
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			console.error("Nominatim error:", response.status, response.statusText);

			return res.status(502).json({
				message: "Nie udało się wyszukać miejscowości.",
			});
		}

		const data = await response.json();

		const results = data.map((place: any) => ({
			name: place.display_name,
			latitude: Number(place.lat),
			longitude: Number(place.lon),
			type: place.type,
		}));

		return res.json(results);
	} catch (error) {
		console.error("Location search error:", error);

		return res.status(500).json({
			message: "Wystąpił błąd podczas wyszukiwania lokalizacji.",
		});
	}
});

export default router;
