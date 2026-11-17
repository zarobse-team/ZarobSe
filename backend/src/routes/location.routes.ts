import { Router } from "express";
import {
	searchCities,
	searchLocations,
	searchStreets,
} from "../services/location.service";

const router = Router();

router.get("/search", async (req, res) => {
	try {
		const query = String(req.query.q ?? "").trim();

		if (!query) {
			return res.status(400).json({
				message: "Podaj miejscowość do wyszukania.",
			});
		}

		const results = await searchLocations(query);

		return res.json(results);
	} catch (error) {
		console.error("Location search error:", error);

		let errorType = "UNKNOWN_ERROR";
		let upstreamStatus: number | null = null;

		if (error instanceof Error) {
			if (error.message.startsWith("Nominatim error:")) {
				errorType = "NOMINATIM_HTTP_ERROR";

				const match = error.message.match(/Nominatim error:\s*(\d{3})/);

				if (match) {
					upstreamStatus = Number(match[1]);
				}
			} else {
				const cause = (
					error as Error & {
						cause?: { code?: string };
					}
				).cause;

				if (cause?.code === "ETIMEDOUT") {
					errorType = "UPSTREAM_TIMEOUT";
				} else if (cause?.code === "ENETUNREACH") {
					errorType = "NETWORK_UNREACHABLE";
				} else if (cause?.code === "ECONNRESET") {
					errorType = "CONNECTION_RESET";
				} else if (error.message === "fetch failed") {
					errorType = "FETCH_FAILED";
				}
			}
		}

		return res.status(500).json({
			message: "Wystąpił błąd podczas wyszukiwania lokalizacji.",
			diagnostic: {
				errorType,
				upstreamStatus,
			},
		});
	}
});

router.get("/cities", async (req, res) => {
	try {
		const query = String(req.query.q ?? "").trim();

		if (!query) {
			return res.status(400).json({
				message: "Podaj nazwę miejscowości.",
			});
		}

		const results = await searchCities(query);

		return res.json(results);
	} catch (error) {
		console.error("City search error:", error);

		return res.status(500).json({
			message: "Wystąpił błąd podczas wyszukiwania miejscowości.",
		});
	}
});

router.get("/streets", async (req, res) => {
	try {
		const city = String(req.query.city ?? "").trim();
		const query = String(req.query.q ?? "").trim();

		if (!city) {
			return res.status(400).json({
				message: "Podaj nazwę miejscowości.",
			});
		}

		if (!query) {
			return res.status(400).json({
				message: "Podaj nazwę ulicy.",
			});
		}

		const results = await searchStreets(city, query);

		return res.json(results);
	} catch (error) {
		console.error("Street search error:", error);

		return res.status(500).json({
			message: "Wystąpił błąd podczas wyszukiwania ulic.",
		});
	}
});

export default router;
