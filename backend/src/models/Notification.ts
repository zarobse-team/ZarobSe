import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
	| "new_message"
	| "new_application"
	| "worker_selected"
	| "job_status"
	| "new_review";

export interface INotification extends Document {
	recipient: mongoose.Types.ObjectId;
	type: NotificationType;
	title: string;
	body: string;
	job?: mongoose.Types.ObjectId;
	isRead: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
	{
		recipient: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: [
				"new_message",
				"new_application",
				"worker_selected",
				"job_status",
				"new_review",
			],
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		body: {
			type: String,
			required: true,
			trim: true,
		},
		job: {
			type: Schema.Types.ObjectId,
			ref: "Job",
		},
		isRead: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true },
);

notificationSchema.index({
	recipient: 1,
	createdAt: -1,
});

export default mongoose.model<INotification>(
	"Notification",
	notificationSchema,
);
