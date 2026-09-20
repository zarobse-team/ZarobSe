import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";

export const cancelJob = async (req: AuthRequest, res: Response) => {
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
        message: "Tylko zleceniodawca może anulować zlecenie.",
      });
    }

    if (job.status === "open") {
      return res.status(400).json({
        message: "Otwarte zlecenie możesz usunąć zamiast anulować.",
      });
    }

    if (job.status === "completed") {
      return res.status(400).json({
        message: "Nie można anulować zakończonego zlecenia.",
      });
    }

    if (job.status === "cancelled") {
      return res.status(400).json({
        message: "To zlecenie jest już anulowane.",
      });
    }

    if (job.status !== "assigned" && job.status !== "in_progress") {
      return res.status(400).json({
        message: "Tego zlecenia nie można teraz anulować.",
      });
    }

    job.status = "cancelled";
    job.completionRequested = false;

    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate("author", "firstName lastName avatar city")
      .populate("assignedTo", "firstName lastName avatar city");

    return res.status(200).json({
      message: "Zlecenie zostało anulowane.",
      job: populatedJob,
    });
  } catch (error) {
    console.error("Cancel job error:", error);

    return res.status(500).json({
      message: "Błąd podczas anulowania zlecenia.",
    });
  }
};
