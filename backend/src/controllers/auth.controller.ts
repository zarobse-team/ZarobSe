import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User";

export const register = async (req: Request, res: Response) => {
	try {
		const { firstName, lastName, email, phone, password } = req.body;

		if (!firstName || !lastName || !email || !phone || !password) {
			return res.status(400).json({
				message: "Wszystkie pola są wymagane.",
			});
		}

		const existingUser = await User.findOne({ email });

		if (existingUser) {
			return res.status(400).json({
				message: "Użytkownik z takim adresem email już istnieje.",
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await User.create({
			firstName,
			lastName,
			email,
			phone,
			password: hashedPassword,
		});

		return res.status(201).json({
			message: "Użytkownik został utworzony.",
			user: {
				id: user._id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				city: user.city,
				role: user.role,
			},
		});
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			message: "Błąd podczas tworzenia użytkownika.",
		});
	}
};

export const login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				message: "Email i hasło są wymagane.",
			});
		}

		const user = await User.findOne({ email });

		if (!user) {
			return res.status(401).json({
				message: "Nieprawidłowy email lub hasło.",
			});
		}

		if (user.isBlocked) {
			return res.status(403).json({
				message: "Konto zostało zablokowane.",
			});
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return res.status(401).json({
				message: "Nieprawidłowy email lub hasło.",
			});
		}

		const token = jwt.sign(
			{
				userId: user._id,
				role: user.role,
			},
			process.env.JWT_SECRET as string,
			{
				expiresIn: "7d",
			},
		);

		return res.status(200).json({
			message: "Logowanie poprawne!",
			token,
		});
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			message: "Błąd podczas logowania.",
		});
	}
};

export const getMe = async (req: AuthRequest, res: Response) => {
	try {
		const user = await User.findById(req.userId).select("-password");

		if (!user) {
			return res.status(404).json({
				message: "Użytkownik nie istnieje.",
			});
		}

		return res.status(200).json(user);
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			message: "Błąd podczas pobierania profilu.",
		});
	}
};

export const updateMe = async (req: AuthRequest, res: Response) => {
	try {
		const { firstName, lastName, phone, city, bio, avatar, skills } = req.body;

		const user = await User.findById(req.userId);

		if (!user) {
			return res.status(404).json({
				message: "Użytkownik nie istnieje.",
			});
		}

		if (firstName !== undefined) user.firstName = firstName;
		if (lastName !== undefined) user.lastName = lastName;
		if (phone !== undefined) user.phone = phone;
		if (city !== undefined) user.city = city;
		if (bio !== undefined) user.bio = bio;
		if (avatar !== undefined) user.avatar = avatar;
		if (skills !== undefined) user.skills = skills;

		await user.save();

		return res.status(200).json({
			message: "Profil został zaktualizowany.",
			user,
		});
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			message: "Błąd podczas aktualizacji profilu.",
		});
	}
};
