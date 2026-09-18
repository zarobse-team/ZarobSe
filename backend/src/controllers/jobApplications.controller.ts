import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import JobApplication from "../models/JobApplication";

export const applyToJob = async (req: AuthRequest, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: "Zlecenie nie istnieje.",
      });
    }

    if (job.author.toString() === req.userId) {
      return res.status(400).json({
        message: "Nie możesz zgłosić się do własnego zlecenia.",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        message: "Do tego zlecenia nie można już się zgłosić.",
      });
    }

    const existingApplication = await JobApplication.findOne({
      job: job._id,
      applicant: req.userId,
    });

    if (existingApplication) {
      return res.status(409).json({
        message: "Już zgłosiłeś się do tego zlecenia.",
      });
    }

    const application = await JobApplication.create({
      job: job._id,
      applicant: req.userId,
    });

    return res.status(201).json({
      message: "Zgłoszenie zostało wysłane.",
      application,
    });
  } catch (error) {
    console.error("Apply to job error:", error);

    return res.status(500).json({
      message: "Błąd podczas wysyłania zgłoszenia.",
    });
  }
};

export const getMyApplicationForJob = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const application = await JobApplication.findOne({
      job: req.params.id,
      applicant: req.userId,
    });

    if (!application) {
      return res.status(200).json({
        applied: false,
        application: null,
      });
    }

    return res.status(200).json({
      applied: true,
      application,
    });
  } catch (error) {
    console.error("Get application status error:", error);

    return res.status(500).json({
      message: "Błąd podczas pobierania statusu zgłoszenia.",
    });
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const applications = await JobApplication.find({
      applicant: req.userId,
    })
      .populate({
        path: "job",
        populate: {
          path: "author",
          select: "firstName lastName avatar city",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error("Get my applications error:", error);

    return res.status(500).json({
      message: "Błąd podczas pobierania Twoich zgłoszeń.",
    });
  }
};

export const withdrawApplication = async (req: AuthRequest, res: Response) => {
  try {
    const application = await JobApplication.findOne({
      job: req.params.id,
      applicant: req.userId,
    });

    if (!application) {
      return res.status(404).json({
        message: "Nie znaleziono zgłoszenia do tego zlecenia.",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        message:
          "Nie możesz wycofać zgłoszenia, które zostało już rozpatrzone.",
      });
    }

    await application.deleteOne();

    return res.status(200).json({
      message: "Zgłoszenie zostało wycofane.",
    });
  } catch (error) {
    console.error("Withdraw application error:", error);

    return res.status(500).json({
      message: "Błąd podczas wycofywania zgłoszenia.",
    });
  }
};

export const getApplicationsForJob = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: "Zlecenie nie istnieje.",
      });
    }

    if (job.author.toString() !== req.userId) {
      return res.status(403).json({
        message: "Nie możesz przeglądać zgłoszeń do tego zlecenia.",
      });
    }

    const applications = await JobApplication.find({
      job: job._id,
    })
      .populate("applicant", "firstName lastName avatar city bio")
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error("Get applications for job error:", error);

    return res.status(500).json({
      message: "Błąd podczas pobierania kandydatów.",
    });
  }
};

export const acceptApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;

    const application = await JobApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        message: "Zgłoszenie nie istnieje.",
      });
    }

    const job = await Job.findById(application.job);

    if (!job) {
      return res.status(404).json({
        message: "Zlecenie nie istnieje.",
      });
    }

    if (job.author.toString() !== req.userId) {
      return res.status(403).json({
        message: "Nie możesz wybrać wykonawcy dla tego zlecenia.",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        message: "To zlecenie nie jest już otwarte.",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        message: "To zgłoszenie zostało już rozpatrzone.",
      });
    }

    application.status = "accepted";
    await application.save();

    await JobApplication.updateMany(
      {
        job: job._id,
        _id: { $ne: application._id },
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
        },
      },
    );

    job.status = "assigned";
    job.assignedTo = application.applicant;

    await job.save();

    return res.status(200).json({
      message: "Kandydat został wybrany.",
      application,
      job,
    });
  } catch (error) {
    console.error("Accept application error:", error);

    return res.status(500).json({
      message: "Błąd podczas wyboru kandydata.",
    });
  }
};
