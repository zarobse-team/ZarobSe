import mongoose, { Document, Schema } from "mongoose";

export interface IJob extends Document {
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  images: string[];
  status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
  author: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  completionRequested: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 5,
        message: "Możesz dodać maksymalnie 5 zdjęć.",
      },
    },
    status: {
      type: String,
      enum: ["open", "assigned", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completionRequested: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Job = mongoose.model<IJob>("Job", jobSchema);

export default Job;
