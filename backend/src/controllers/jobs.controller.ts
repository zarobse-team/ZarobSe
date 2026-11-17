import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import { searchLocations } from "../services/location.service";
import { createNotification } from "../services/notification.service";
import { createSystemMessage } from "../services/systemMessage.service";

export const createJob = async (req: AuthRequest, res: Response) => {
	try {
		const {
			title,
			description,
			category,
			city,
			street,
			budget,
			images = [],
		} = req.body;

		if (
			!title ||
			!description ||
			!category ||
			!city ||
			!street ||
			budget === undefined
		) {
			return res.status(400).json({
				message: "Uzupełnij wszystkie wymagane pola.",
			});
		}

		if (!Array.isArray(images)) {
			return res.status(400).json({
				message: "Zdjęcia muszą być przesłane jako tablica.",
			});
		}

		if (images.length > 5) {
			return res.status(400).json({
				message: "Możesz dodać maksymalnie 5 zdjęć.",
			});
		}

		if (!images.every((image) => typeof image === "string")) {
			return res.status(400).json({
				message: "Nieprawidłowy format zdjęć.",
			});
		}

		let normalizedCity = city;
		let normalizedStreet = street;
		let latitude: number | undefined = undefined;
		let longitude: number | undefined = undefined;

		// Nominatim jest usługą zewnętrzną.
		// Jej błąd nie może blokować tworzenia zlecenia.
		try {
			const locations = await Promise.race([
				searchLocations(`${street}, ${city}`, 1),
				new Promise<Awaited<ReturnType<typeof searchLocations>>>((resolve) => {
					setTimeout(() => resolve([]), 5000);
				}),
			]);

			if (locations.length > 0) {
				const location = locations[0];

				const lat = Number(location.latitude);
				const lon = Number(location.longitude);

				if (
					Number.isFinite(lat) &&
					Number.isFinite(lon) &&
					lat >= -90 &&
					lat <= 90 &&
					lon >= -180 &&
					lon <= 180
				) {
					normalizedCity = location.city || city;
					normalizedStreet = location.street || street;
					latitude = lat;
					longitude = lon;
				}
			}
		} catch (error) {
			console.warn("Nie udało się pobrać współrzędnych z Nominatim:", error);
		}

		const job = await Job.create({
			title,
			description,
			category,
			city: normalizedCity,
			street: normalizedStreet,
			latitude,
			longitude,
			budget,
			images,
			author: req.userId,
		});

		const populatedJob = await Job.findById(job._id).populate(
			"author",
			"firstName lastName avatar city",
		);

		return res.status(201).json(populatedJob);
	} catch (error) {
		console.error("Create job error:", error);

		return res.status(500).json({
			message: "Błąd podczas tworzenia zlecenia.",
		});
	}
};

export const getJobs = async (_req: AuthRequest, res: Response) => {
	try {
		const jobs = await Job.find({
			status: "open",
		})
			.populate("author", "firstName lastName avatar city")
			.sort({ createdAt: -1 });

		return res.status(200).json(jobs);
	} catch (error) {
		console.error("Get jobs error:", error);

		return res.status(500).json({
			message: "Błąd podczas pobierania zleceń.",
		});
	}
};

export const getMyJobs = async (req: AuthRequest, res: Response) => {
	try {
		const jobs = await Job.find({
			author: req.userId,
		})
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city")
			.sort({ createdAt: -1 });

		return res.status(200).json(jobs);
	} catch (error) {
		console.error("Get my jobs error:", error);

		return res.status(500).json({
			message: "Błąd podczas pobierania Twoich zleceń.",
		});
	}
};

export const getJobById = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id)
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city");

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		return res.status(200).json(job);
	} catch (error) {
		console.error("Get job by id error:", error);

		return res.status(500).json({
			message: "Błąd podczas pobierania zlecenia.",
		});
	}
};

export const updateJob = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id);

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		if (job.author.toString() !== req.userId) {
			return res.status(403).json({
				message: "Nie możesz edytować tego zlecenia.",
			});
		}

		if (job.status !== "open") {
			return res.status(400).json({
				message: "Nie można edytować zlecenia po wybraniu wykonawcy.",
			});
		}

		const { title, description, category, city, budget, images } = req.body;

		if (title !== undefined) {
			job.title = title;
		}

		if (description !== undefined) {
			job.description = description;
		}

		if (category !== undefined) {
			job.category = category;
		}

		if (city !== undefined) {
			job.city = city;
		}

		if (budget !== undefined) {
			job.budget = budget;
		}

		if (images !== undefined) {
			if (!Array.isArray(images)) {
				return res.status(400).json({
					message: "Zdjęcia muszą być przesłane jako tablica.",
				});
			}

			if (images.length > 5) {
				return res.status(400).json({
					message: "Możesz dodać maksymalnie 5 zdjęć.",
				});
			}

			if (!images.every((image) => typeof image === "string")) {
				return res.status(400).json({
					message: "Nieprawidłowy format zdjęć.",
				});
			}

			job.images = images;
		}

		await job.save();

		const populatedJob = await Job.findById(job._id)
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city");

		return res.status(200).json(populatedJob);
	} catch (error) {
		console.error("Update job error:", error);

		return res.status(500).json({
			message: "Błąd podczas edycji zlecenia.",
		});
	}
};

export const deleteJob = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id);

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		if (job.author.toString() !== req.userId) {
			return res.status(403).json({
				message: "Nie możesz usunąć tego zlecenia.",
			});
		}

		if (job.status !== "open") {
			return res.status(400).json({
				message: "Nie można usunąć zlecenia po wybraniu wykonawcy.",
			});
		}

		await job.deleteOne();

		return res.status(200).json({
			message: "Zlecenie zostało usunięte.",
		});
	} catch (error) {
		console.error("Delete job error:", error);

		return res.status(500).json({
			message: "Błąd podczas usuwania zlecenia.",
		});
	}
};

export const startJob = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id);

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		if (!job.assignedTo) {
			return res.status(400).json({
				message: "To zlecenie nie ma jeszcze wybranego wykonawcy.",
			});
		}

		if (job.assignedTo.toString() !== req.userId) {
			return res.status(403).json({
				message: "Tylko wybrany wykonawca może rozpocząć to zlecenie.",
			});
		}

		if (job.status !== "assigned") {
			return res.status(400).json({
				message: "To zlecenie nie może zostać teraz rozpoczęte.",
			});
		}

		job.status = "in_progress";
		job.completionRequested = false;

		await job.save();

		try {
			await createNotification({
				recipientId: job.author.toString(),
				type: "job_status",
				title: "Rozpoczęto realizację",
				body: `Wykonawca rozpoczął zlecenie: ${job.title}`,
				jobId: job._id.toString(),
			});
		} catch (error) {
			console.error("Start job notification error:", error);
		}

		try {
			await createSystemMessage({
				jobId: job._id.toString(),
				eventKey: "work_started",
				content: "Rozpoczęto realizację zlecenia.",
			});
		} catch (error) {
			console.error("Create work started system message error:", error);
		}

		const populatedJob = await Job.findById(job._id)
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city");

		return res.status(200).json({
			message: "Zlecenie zostało rozpoczęte.",
			job: populatedJob,
		});
	} catch (error) {
		console.error("Start job error:", error);

		return res.status(500).json({
			message: "Błąd podczas rozpoczynania zlecenia.",
		});
	}
};

export const requestJobCompletion = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id);

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		if (!job.assignedTo) {
			return res.status(400).json({
				message: "To zlecenie nie ma przypisanego wykonawcy.",
			});
		}

		if (job.assignedTo.toString() !== req.userId) {
			return res.status(403).json({
				message:
					"Tylko wybrany wykonawca może oznaczyć zlecenie jako wykonane.",
			});
		}

		if (job.status !== "in_progress") {
			return res.status(400).json({
				message: "To zlecenie nie jest obecnie w trakcie realizacji.",
			});
		}

		if (job.completionRequested) {
			return res.status(400).json({
				message: "Zakończenie tego zlecenia zostało już zgłoszone.",
			});
		}

		job.completionRequested = true;

		await job.save();

		try {
			await createNotification({
				recipientId: job.author.toString(),
				type: "job_status",
				title: "Zgłoszono zakończenie pracy",
				body: `Wykonawca zgłosił zakończenie: ${job.title}`,
				jobId: job._id.toString(),
			});
		} catch (error) {
			console.error("Completion request notification error:", error);
		}

		try {
			await createSystemMessage({
				jobId: job._id.toString(),
				eventKey: "completion_requested",
				content:
					"Wykonawca zgłosił zakończenie pracy. Oczekiwanie na potwierdzenie zleceniodawcy.",
			});
		} catch (error) {
			console.error("Create completion requested system message error:", error);
		}

		const populatedJob = await Job.findById(job._id)
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city");

		return res.status(200).json({
			message: "Zlecenie zostało oznaczone jako wykonane.",
			job: populatedJob,
		});
	} catch (error) {
		console.error("Request completion error:", error);

		return res.status(500).json({
			message: "Błąd podczas oznaczania zlecenia jako wykonanego.",
		});
	}
};

export const completeJob = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		const job = await Job.findById(id);

		if (!job) {
			return res.status(404).json({
				message: "Zlecenie nie istnieje.",
			});
		}

		if (job.author.toString() !== req.userId) {
			return res.status(403).json({
				message: "Tylko zleceniodawca może potwierdzić zakończenie zlecenia.",
			});
		}

		if (job.status !== "in_progress") {
			return res.status(400).json({
				message: "To zlecenie nie jest obecnie w trakcie realizacji.",
			});
		}

		if (!job.completionRequested) {
			return res.status(400).json({
				message: "Wykonawca nie oznaczył jeszcze zlecenia jako wykonanego.",
			});
		}

		job.status = "completed";
		job.completionRequested = false;

		await job.save();

		if (job.assignedTo) {
			try {
				await createNotification({
					recipientId: job.assignedTo.toString(),
					type: "job_status",
					title: "Zlecenie zakończone",
					body: `Zleceniodawca potwierdził wykonanie: ${job.title}`,
					jobId: job._id.toString(),
				});
			} catch (error) {
				console.error("Job completed notification error:", error);
			}
		}

		try {
			await createSystemMessage({
				jobId: job._id.toString(),
				eventKey: "job_completed",
				content: "Zlecenie zostało pomyślnie zakończone.",
			});
		} catch (error) {
			console.error("Create job completed system message error:", error);
		}

		const populatedJob = await Job.findById(job._id)
			.populate("author", "firstName lastName avatar city")
			.populate("assignedTo", "firstName lastName avatar city");

		return res.status(200).json({
			message: "Zlecenie zostało zakończone.",
			job: populatedJob,
		});
	} catch (error) {
		console.error("Complete job error:", error);

		return res.status(500).json({
			message: "Błąd podczas kończenia zlecenia.",
		});
	}
};
