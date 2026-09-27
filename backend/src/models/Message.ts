import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  job: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
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

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
 