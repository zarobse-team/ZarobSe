import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import Job from "../models/Job";
import Message from "../models/Message";

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

    const messages = await Message.find({
      job: jobId,
    })
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

    const message = await Message.create({
      job: jobId,
      sender: userId,
      content,
    });

    await message.populate("sender", "firstName lastName avatar");

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

    await Message.updateMany(
      {
        job: jobId,
        sender: {
          $ne: userId,
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
    console.error("Mark messages as read error:", error);

    return res.status(500).json({
      message: "Nie udało się oznaczyć wiadomości jako przeczytanych.",
    });
  }
};
