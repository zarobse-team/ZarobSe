import mongoose from "mongoose";
import Notification, { NotificationType } from "../models/Notification";

interface CreateNotificationParams {
	recipientId: string;
	type: NotificationType;
	title: string;
	body: string;
	jobId?: string;
}

export const createNotification = async ({
	recipientId,
	type,
	title,
	body,
	jobId,
}: CreateNotificationParams) => {
	if (!mongoose.isValidObjectId(recipientId)) {
		throw new Error("Nieprawidłowe ID odbiorcy.");
	}

	if (jobId && !mongoose.isValidObjectId(jobId)) {
		throw new Error("Nieprawidłowe ID zlecenia.");
	}

	const notification = await Notification.create({
		recipient: recipientId,
		type,
		title,
		body,
		...(jobId ? { job: jobId } : {}),
		isRead: false,
	});

	return notification;
};
