import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import JobApplication from "../models/JobApplication";
import Message from "../models/Message";
import { createNotification } from "../services/notification.service";

const getJobId = (id: string | string[] | undefined) => {
	if (Array.isArray(id)) {
		return id[0];
	}

	return id;
};

const canAccessJobChat = async (jobId: string, userId: string) => {
	const job = await Job.findById(jobId);

	if (!job) {
		return {
			ok: false as const,
			status: 404,
			message: "Nie znaleziono zlecenia.",
			job: null,
		};
	}

	if (!job.assignedTo) {
		return {
			ok: false as const,
			status: 403,
			message: "Czat jest dostępny dopiero po wybraniu wykonawcy.",
			job,
		};
	}

	const isAuthor = job.author.toString() === userId;
	const isAssignedWorker = job.assignedTo.toString() === userId;

	if (!isAuthor && !isAssignedWorker) {
		return {
			ok: false as const,
			status: 403,
			message: "Nie masz dostępu do tego czatu.",
			job,
		};
	}

	return {
		ok: true as const,
		status: 200,
		message: "",
		job,
	};
};

const canAccessApplicationChat = async (
	applicationId: string,
	userId: string,
) => {
	const application = await JobApplication.findById(applicationId);

	if (!application) {
		return {
			ok: false as const,
			status: 404,
			message: "Nie znaleziono zgłoszenia.",
			application: null,
			job: null,
		};
	}

	const job = await Job.findById(application.job);

	if (!job) {
		return {
			ok: false as const,
			status: 404,
			message: "Nie znaleziono zlecenia.",
			application,
			job: null,
		};
	}

	const isAuthor = job.author.toString() === userId;
	const isApplicant = application.applicant.toString() === userId;

	if (!isAuthor && !isApplicant) {
		return {
			ok: false as const,
			status: 403,
			message: "Nie masz dostępu do tej rozmowy.",
			application,
			job,
		};
	}

	return {
		ok: true as const,
		status: 200,
		message: "",
		application,
		job,
	};
};

export const getApplicationMessages = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		const applicationId = getJobId(req.params.applicationId);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!applicationId) {
			return res.status(400).json({
				message: "Brak identyfikatora zgłoszenia.",
			});
		}

		const access = await canAccessApplicationChat(applicationId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		const messageFilter =
			access.application.status === "accepted"
				? {
						job: access.job._id,
						$or: [
							{
								application: access.application._id,
							},
							{
								application: null,
								type: "system" as const,
							},
						],
					}
				: {
						job: access.job._id,
						application: access.application._id,
					};

		const messages = await Message.find(messageFilter)
			.populate("sender", "firstName lastName avatar")
			.sort({
				createdAt: 1,
			});

		return res.status(200).json(messages);
	} catch (error) {
		console.error("Get application messages error:", error);

		return res.status(500).json({
			message: "Nie udało się pobrać wiadomości.",
		});
	}
};

export const sendApplicationMessage = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		const applicationId = getJobId(req.params.applicationId);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!applicationId) {
			return res.status(400).json({
				message: "Brak identyfikatora zgłoszenia.",
			});
		}

		const access = await canAccessApplicationChat(applicationId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		const { application, job } = access;

		if (
			application.status === "rejected" ||
			(job.status !== "open" && application.status !== "accepted")
		) {
			return res.status(403).json({
				message: "Nie możesz już wysyłać wiadomości w tej rozmowie.",
			});
		}

		const rawContent =
			typeof req.body?.content === "string" ? req.body.content : "";

		const content = rawContent.trim();

		if (!content) {
			return res.status(400).json({
				message: "Treść wiadomości jest wymagana.",
			});
		}

		if (content.length > 2000) {
			return res.status(400).json({
				message: "Wiadomość może mieć maksymalnie 2000 znaków.",
			});
		}

		const message = await Message.create({
			job: job._id,
			application: application._id,
			sender: userId,
			content,
			type: "user",
		});

		await message.populate("sender", "firstName lastName avatar");

		const recipientId =
			job.author.toString() === userId
				? application.applicant.toString()
				: job.author.toString();

		try {
			await createNotification({
				recipientId,
				type: "new_message",
				title: "Nowa wiadomość",
				body: `Masz nową wiadomość dotyczącą: ${job.title}`,
				jobId: job._id.toString(),
			});
		} catch (notificationError) {
			console.error("Błąd powiadomienia o wiadomości:", notificationError);
		}

		return res.status(201).json(message);
	} catch (error) {
		console.error("Send application message error:", error);

		return res.status(500).json({
			message: "Nie udało się wysłać wiadomości.",
		});
	}
};

export const markApplicationMessagesAsRead = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		const applicationId = getJobId(req.params.applicationId);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!applicationId) {
			return res.status(400).json({
				message: "Brak identyfikatora zgłoszenia.",
			});
		}

		const access = await canAccessApplicationChat(applicationId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		await Message.updateMany(
			{
				job: access.job._id,
				application: access.application._id,
				sender: {
					$ne: userId,
					$exists: true,
				},
				readAt: null,
			},
			{
				$set: {
					readAt: new Date(),
				},
			},
		);

		return res.status(200).json({
			message: "Wiadomości zostały oznaczone jako przeczytane.",
		});
	} catch (error) {
		console.error("Mark application messages as read error:", error);

		return res.status(500).json({
			message: "Nie udało się oznaczyć wiadomości jako przeczytanych.",
		});
	}
};

export const getJobMessages = async (req: AuthRequest, res: Response) => {
	try {
		const jobId = getJobId(req.params.id);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!jobId) {
			return res.status(400).json({
				message: "Brak identyfikatora zlecenia.",
			});
		}

		const access = await canAccessJobChat(jobId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		const acceptedApplication = await JobApplication.findOne({
			job: access.job._id,
			status: "accepted",
		});

		const messageFilter = acceptedApplication
			? {
					job: jobId,
					$or: [
						{ application: acceptedApplication._id },
						{ application: null },
					],
				}
			: {
					job: jobId,
					application: null,
				};

		const messages = await Message.find(messageFilter)
			.populate("sender", "firstName lastName avatar")
			.sort({
				createdAt: 1,
			});

		return res.status(200).json(messages);
	} catch (error) {
		console.error("Get job messages error:", error);

		return res.status(500).json({
			message: "Nie udało się pobrać wiadomości.",
		});
	}
};

export const sendJobMessage = async (req: AuthRequest, res: Response) => {
	try {
		const jobId = getJobId(req.params.id);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!jobId) {
			return res.status(400).json({
				message: "Brak identyfikatora zlecenia.",
			});
		}

		const access = await canAccessJobChat(jobId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		const rawContent =
			typeof req.body?.content === "string" ? req.body.content : "";

		const content = rawContent.trim();

		if (!content) {
			return res.status(400).json({
				message: "Treść wiadomości jest wymagana.",
			});
		}

		if (content.length > 2000) {
			return res.status(400).json({
				message: "Wiadomość może mieć maksymalnie 2000 znaków.",
			});
		}

		const acceptedApplication = await JobApplication.findOne({
			job: access.job._id,
			status: "accepted",
		});

		const message = await Message.create({
			job: jobId,
			application: acceptedApplication?._id ?? null,
			sender: userId,
			content,
			type: "user",
		});

		await message.populate("sender", "firstName lastName avatar");

		const recipientId =
			access.job.author.toString() === userId
				? access.job.assignedTo!.toString()
				: access.job.author.toString();

		try {
			await createNotification({
				recipientId,
				type: "new_message",
				title: "Nowa wiadomość",
				body: `Masz nową wiadomość dotyczącą: ${access.job.title}`,
				jobId: access.job._id.toString(),
			});
		} catch (notificationError) {
			console.error("Błąd powiadomienia o wiadomości:", notificationError);
		}

		return res.status(201).json(message);
	} catch (error) {
		console.error("Send job message error:", error);

		return res.status(500).json({
			message: "Nie udało się wysłać wiadomości.",
		});
	}
};

export const markJobMessagesAsRead = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		const jobId = getJobId(req.params.id);
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		if (!jobId) {
			return res.status(400).json({
				message: "Brak identyfikatora zlecenia.",
			});
		}

		const access = await canAccessJobChat(jobId, userId);

		if (!access.ok) {
			return res.status(access.status).json({
				message: access.message,
			});
		}

		const acceptedApplication = await JobApplication.findOne({
			job: access.job._id,
			status: "accepted",
		});

		const messageFilter = acceptedApplication
			? {
					job: jobId,
					$or: [
						{ application: acceptedApplication._id },
						{ application: null },
					],
					sender: {
						$ne: userId,
						$exists: true,
					},
					readAt: null,
				}
			: {
					job: jobId,
					application: null,
					sender: {
						$ne: userId,
						$exists: true,
					},
					readAt: null,
				};

		await Message.updateMany(messageFilter, {
			$set: {
				readAt: new Date(),
			},
		});

		return res.status(200).json({
			message: "Wiadomości zostały oznaczone jako przeczytane.",
		});
	} catch (error) {
		console.error("Mark messages as read error:", error);

		return res.status(500).json({
			message: "Nie udało się oznaczyć wiadomości jako przeczytanych.",
		});
	}
};
