import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import Notification from "../models/Notification";

// Pobieranie powiadomień użytkownika
export const getNotifications = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		const notifications = await Notification.find({
			recipient: userId,
		})
			.sort({ createdAt: -1 })
			.limit(50)
			.lean();

		return res.status(200).json(notifications);
	} catch (error) {
		console.error("getNotifications:", error);
		return res.status(500).json({
			message: "Nie udało się pobrać powiadomień.",
		});
	}
};

// Liczba nieprzeczytanych powiadomień
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		const count = await Notification.countDocuments({
			recipient: req.userId,
			isRead: false,
		});

		return res.status(200).json({ count });
	} catch (error) {
		console.error("getUnreadCount:", error);
		return res.status(500).json({
			message: "Nie udało się pobrać licznika.",
		});
	}
};

// Oznaczenie pojedynczego powiadomienia
export const markNotificationAsRead = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		if (!req.userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		const { id } = req.params;

		if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
			return res.status(400).json({
				message: "Nieprawidłowe ID powiadomienia.",
			});
		}

		const notification = await Notification.findOneAndUpdate(
			{
				_id: id,
				recipient: req.userId,
			},
			{ $set: { isRead: true } },
			{ new: true },
		);

		if (!notification) {
			return res.status(404).json({
				message: "Nie znaleziono powiadomienia.",
			});
		}

		return res.status(200).json(notification);
	} catch (error) {
		console.error("markNotificationAsRead:", error);
		return res.status(500).json({
			message: "Nie udało się zaktualizować powiadomienia.",
		});
	}
};

// Oznaczenie wszystkich jako przeczytane
export const markAllNotificationsAsRead = async (
	req: AuthRequest,
	res: Response,
) => {
	try {
		if (!req.userId) {
			return res.status(401).json({
				message: "Brak autoryzacji.",
			});
		}

		const result = await Notification.updateMany(
			{
				recipient: req.userId,
				isRead: false,
			},
			{ $set: { isRead: true } },
		);

		return res.status(200).json({
			message: "Powiadomienia oznaczone jako przeczytane.",
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		console.error("markAllNotificationsAsRead:", error);
		return res.status(500).json({
			message: "Nie udało się zaktualizować powiadomień.",
		});
	}
};
