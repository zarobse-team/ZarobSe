import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";

export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, city, budget } = req.body;

    if (!title || !description || !category || !city || budget === undefined) {
      return res.status(400).json({
        message: "Wszystkie pola są wymagane.",
      });
    }

    const numericBudget = Number(budget);

    if (Number.isNaN(numericBudget) || numericBudget < 0) {
      return res.status(400).json({
        message: "Budżet musi być poprawną liczbą większą lub równą 0.",
      });
    }

    const job = await Job.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      city: String(city).trim(),
      budget: numericBudget,
      author: req.userId,
    });

    return res.status(201).json({
      message: "Zlecenie zostało utworzone.",
      job,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas tworzenia zlecenia.",
    });
  }
};

export const getJobs = async (_req: AuthRequest, res: Response) => {
  try {
    const jobs = await Job.find()
      .populate("author", "firstName lastName avatar city")
      .sort({ createdAt: -1 });

    return res.status(200).json(jobs);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas pobierania zleceń.",
    });
  }
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "author",
      "firstName lastName avatar city",
    );

    if (!job) {
      return res.status(404).json({
        message: "Zlecenie nie istnieje.",
      });
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas pobierania zlecenia.",
    });
  }
};

export const getMyJobs = async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await Job.find({
      author: req.userId,
    })
      .populate("author", "firstName lastName avatar city")
      .sort({ createdAt: -1 });

    return res.status(200).json(jobs);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas pobierania Twoich zleceń.",
    });
  }
};

export const updateJob = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, city, budget } = req.body;

    const job = await Job.findById(req.params.id);

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

    if (title !== undefined) {
      const value = String(title).trim();

      if (!value || value.length > 100) {
        return res.status(400).json({
          message: "Nieprawidłowy tytuł zlecenia.",
        });
      }

      job.title = value;
    }

    if (description !== undefined) {
      const value = String(description).trim();

      if (!value || value.length > 1000) {
        return res.status(400).json({
          message: "Nieprawidłowy opis zlecenia.",
        });
      }

      job.description = value;
    }

    if (category !== undefined) {
      const value = String(category).trim();

      if (!value) {
        return res.status(400).json({
          message: "Kategoria nie może być pusta.",
        });
      }

      job.category = value;
    }

    if (city !== undefined) {
      const value = String(city).trim();

      if (!value || value.length > 80) {
        return res.status(400).json({
          message: "Nieprawidłowa miejscowość.",
        });
      }

      job.city = value;
    }

    if (budget !== undefined) {
      const numericBudget = Number(budget);

      if (Number.isNaN(numericBudget) || numericBudget < 0) {
        return res.status(400).json({
          message: "Podaj poprawny budżet.",
        });
      }

      job.budget = numericBudget;
    }

    await job.save();

    return res.status(200).json({
      message: "Zlecenie zostało zaktualizowane.",
      job,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas aktualizacji zlecenia.",
    });
  }
};

export const deleteJob = async (req: AuthRequest, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);

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

    await job.deleteOne();

    return res.status(200).json({
      message: "Zlecenie zostało usunięte.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Błąd podczas usuwania zlecenia.",
    });
  }
};
