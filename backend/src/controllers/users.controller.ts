import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import User from "../models/User";

export const getPublicUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select(
      "firstName lastName avatar city bio createdAt",
    );

    if (!user) {
      return res.status(404).json({
        message: "Użytkownik nie istnieje.",
      });
    }

    const postedJobsCount = await Job.countDocuments({
      author: user._id,
    });

    const completedJobsCount = await Job.countDocuments({
      author: user._id,
      status: "completed",
    });

    return res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      city: user.city,
      bio: user.bio,
      createdAt: user.createdAt,

      stats: {
        postedJobs: postedJobsCount,
        completedJobs: completedJobsCount,

        rating: null,
        reviewsCount: 0,
      },
    });
  } catch (error) {
    console.error("Public profile error:", error);

    return res.status(500).json({
      message: "Błąd podczas pobierania profilu użytkownika.",
    });
  }
};
