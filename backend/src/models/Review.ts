import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  job: mongoose.Types.ObjectId;
  reviewer: mongoose.Types.ObjectId;
  reviewedUser: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  {
    job: 1,
    reviewer: 1,
  },
  {
    unique: true,
  },
);

const Review = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
