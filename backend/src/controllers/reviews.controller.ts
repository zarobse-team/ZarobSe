import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import Review from "../models/Review";

const getParamId = (id: string | string[] | undefined) => {
  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const jobId = getParamId(req.params.id);
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

    const { rating, comment = "" } = req.body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Ocena musi być liczbą od 1 do 5.",
      });
    }

    if (typeof comment !== "string") {
      return res.status(400).json({
        message: "Komentarz musi być tekstem.",
      });
    }

    const trimmedComment = comment.trim();

    if (trimmedComment.length > 1000) {
      return res.status(400).json({
        message: "Komentarz może mieć maksymalnie 1000 znaków.",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Zlecenie nie istnieje.",
      });
    }

    if (job.status !== "completed") {
      return res.status(400).json({
        message: "Opinię można wystawić dopiero po zakończeniu zlecenia.",
      });
    }

    if (!job.assignedTo) {
      return res.status(400).json({
        message: "To zlecenie nie ma przypisanego wykonawcy.",
      });
    }

    const authorId = job.author.toString();
    const assignedToId = job.assignedTo.toString();

    let reviewedUserId: string;

    if (authorId === userId) {
      reviewedUserId = assignedToId;
    } else if (assignedToId === userId) {
      reviewedUserId = authorId;
    } else {
      return res.status(403).json({
        message: "Nie możesz wystawić opinii dla tego zlecenia.",
      });
    }

    if (reviewedUserId === userId) {
      return res.status(400).json({
        message: "Nie możesz ocenić samego siebie.",
      });
    }

    const existingReview = await Review.findOne({
      job: jobId,
      reviewer: userId,
    });

    if (existingReview) {
      return res.status(409).json({
        message: "Wystawiłeś już opinię dla tego zlecenia.",
      });
    }

    const review = await Review.create({
      job: jobId,
      reviewer: userId,
      reviewedUser: reviewedUserId,
      rating,
      comment: trimmedComment,
    });

    const populatedReview = await Review.findById(review._id)
      .populate("reviewer", "firstName lastName avatar")
      .populate("reviewedUser", "firstName lastName avatar");

    return res.status(201).json(populatedReview);
  } catch (error: any) {
    console.error("Create review error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Wystawiłeś już opinię dla tego zlecenia.",
      });
    }

    return res.status(500).json({
      message: "Nie udało się wystawić opinii.",
    });
  }
};

export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getParamId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "Brak identyfikatora użytkownika.",
      });
    }

    const reviews = await Review.find({
      reviewedUser: userId,
    })
      .populate("reviewer", "firstName lastName avatar")
      .populate("job", "title")
      .sort({
        createdAt: -1,
      });

    const ratingSummary = await Review.aggregate([
      {
        $match: {
          reviewedUser: new (await import("mongoose")).default.Types.ObjectId(
            userId,
          ),
        },
      },
      {
        $group: {
          _id: "$reviewedUser",
          averageRating: {
            $avg: "$rating",
          },
          reviewsCount: {
            $sum: 1,
          },
        },
      },
    ]);

    const summary = ratingSummary[0] ?? {
      averageRating: 0,
      reviewsCount: 0,
    };

    return res.status(200).json({
      reviews,
      averageRating: Number(summary.averageRating?.toFixed?.(1) ?? 0),
      reviewsCount: summary.reviewsCount ?? 0,
    });
  } catch (error) {
    console.error("Get user reviews error:", error);

    return res.status(500).json({
      message: "Nie udało się pobrać opinii użytkownika.",
    });
  }
};

export const getMyReviewForJob = async (req: AuthRequest, res: Response) => {
  try {
    const jobId = getParamId(req.params.id);
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

    const review = await Review.findOne({
      job: jobId,
      reviewer: userId,
    });

    return res.status(200).json({
      reviewed: Boolean(review),
      review,
    });
  } catch (error) {
    console.error("Get my review error:", error);

    return res.status(500).json({
      message: "Nie udało się pobrać informacji o opinii.",
    });
  }
};
