import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  job: mongoose.Types.ObjectId;
  application?: mongoose.Types.ObjectId | null;
  sender?: mongoose.Types.ObjectId;
  type: "user" | "system";
  eventKey?:
    | "worker_selected"
    | "work_started"
    | "completion_requested"
    | "job_completed"
    | "job_cancelled";
  content: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    application: {
      type: Schema.Types.ObjectId,
      ref: "JobApplication",
      default: null,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function (this: IMessage) {
        return this.type === "user";
      },
    },

    type: {
      type: String,
      enum: ["user", "system"],
      default: "user",
      required: true,
    },

    eventKey: {
      type: String,
      enum: [
        "worker_selected",
        "work_started",
        "completion_requested",
        "job_completed",
        "job_cancelled",
      ],
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  job: 1,
  createdAt: 1,
});

messageSchema.index({
  job: 1,
  application: 1,
  createdAt: 1,
});

messageSchema.index(
  {
    job: 1,
    eventKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      eventKey: { $type: "string" },
    },
  },
);

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
