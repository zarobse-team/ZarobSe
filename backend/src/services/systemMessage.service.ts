import Message from "../models/Message";

type SystemEventKey =
  | "worker_selected"
  | "work_started"
  | "completion_requested"
  | "job_completed"
  | "job_cancelled";

interface CreateSystemMessageParams {
  jobId: string;
  eventKey: SystemEventKey;
  content: string;
}

export const createSystemMessage = async ({
  jobId,
  eventKey,
  content,
}: CreateSystemMessageParams) => {
  try {
    const message = await Message.create({
      job: jobId,
      type: "system",
      eventKey,
      content,
    });

    return message;
  } catch (error: unknown) {
    console.error("[SYSTEM MESSAGE] Error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return null;
    }

    throw error;
  }
};
