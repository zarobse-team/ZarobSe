import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User";

const phoneRegex = /^\+?[0-9]{9,15}$/;

const isValidPhone = (phone: string): boolean => {
  const normalizedPhone = phone.replace(/[\s()-]/g, "");
  return phoneRegex.test(normalizedPhone);
};

export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        message: "Wszystkie pola są wymagane.",
      });
    }

    const trimmedFirstName = String(firstName).trim();
    const trimmedLastName = String(lastName).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPhone = String(phone).trim();

    if (trimmedFirstName.length > 50) {
      return res.status(400).json({
        message: "Imię może mieć maksymalnie 50 znaków.",
      });
    }

    if (trimmedLastName.length > 50) {
      return res.status(400).json({
        message: "Nazwisko może mieć maksymalnie 50 znaków.",
      });
    }

    if (!isValidPhone(trimmedPhone)) {
      return res.status(400).json({
        message: "Podaj poprawny numer telefonu.",
      });
    }

    const existingUser = await User.findOne({
      email: trimmedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Użytkownik z takim adresem email już istnieje.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedPhone,
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

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

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

    if (firstName !== undefined) {
      const value = String(firstName).trim();

      if (!value) {
        return res.status(400).json({
          message: "Imię nie może być puste.",
        });
      }

      if (value.length > 50) {
        return res.status(400).json({
          message: "Imię może mieć maksymalnie 50 znaków.",
        });
      }

      user.firstName = value;
    }

    if (lastName !== undefined) {
      const value = String(lastName).trim();

      if (!value) {
        return res.status(400).json({
          message: "Nazwisko nie może być puste.",
        });
      }

      if (value.length > 50) {
        return res.status(400).json({
          message: "Nazwisko może mieć maksymalnie 50 znaków.",
        });
      }

      user.lastName = value;
    }

    if (phone !== undefined) {
      const value = String(phone).trim();

      if (!isValidPhone(value)) {
        return res.status(400).json({
          message: "Podaj poprawny numer telefonu.",
        });
      }

      user.phone = value;
    }

    if (city !== undefined) {
      const value = String(city).trim();

      if (value.length > 80) {
        return res.status(400).json({
          message: "Miejscowość może mieć maksymalnie 80 znaków.",
        });
      }

      user.city = value;
    }

    if (bio !== undefined) {
      const value = String(bio).trim();

      if (value.length > 300) {
        return res.status(400).json({
          message: "Opis profilu może mieć maksymalnie 300 znaków.",
        });
      }

      user.bio = value;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== "string") {
        return res.status(400).json({
          message: "Nieprawidłowe zdjęcie profilowe.",
        });
      }

      user.avatar = avatar.trim();
    }

    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          message: "Umiejętności muszą być tablicą.",
        });
      }

      if (skills.length > 10) {
        return res.status(400).json({
          message: "Możesz dodać maksymalnie 10 umiejętności.",
        });
      }

      const cleanedSkills = skills
        .map((skill) => String(skill).trim())
        .filter((skill) => skill.length > 0);

      const hasTooLongSkill = cleanedSkills.some((skill) => skill.length > 30);

      if (hasTooLongSkill) {
        return res.status(400).json({
          message: "Jedna umiejętność może mieć maksymalnie 30 znaków.",
        });
      }

      const uniqueSkills = [
        ...new Map(
          cleanedSkills.map((skill) => [skill.toLowerCase(), skill]),
        ).values(),
      ];

      user.skills = uniqueSkills;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      message: "Profil został zaktualizowany.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas aktualizacji profilu.",
    });
  }
};
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Aktualne i nowe hasło są wymagane.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Nowe hasło musi mieć co najmniej 8 znaków.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "Nowe hasło musi różnić się od aktualnego.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Użytkownik nie istnieje.",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: "Aktualne hasło jest nieprawidłowe.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(req.userId, {
      password: hashedPassword,
    });

    return res.status(200).json({
      message: "Hasło zostało zmienione.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas zmiany hasła.",
    });
  }
};
