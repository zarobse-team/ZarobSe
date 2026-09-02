import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	password: string;
	city?: string;
	bio?: string;
	avatar?: string;
	skills: string[];
	role: "user" | "admin";
	isBlocked: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
	{
		firstName: {
			type: String,
			required: true,
			trim: true,
		},

		lastName: {
			type: String,
			required: true,
			trim: true,
		},

		email: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			lowercase: true,
		},

		phone: {
			type: String,
			required: true,
			trim: true,
		},

		password: {
			type: String,
			required: true,
		},

		city: {
			type: String,
			default: "",
			trim: true,
		},

		bio: {
			type: String,
			default: "",
		},

		avatar: {
			type: String,
			default: "",
		},

		skills: {
			type: [String],
			default: [],
		},

		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
		},

		isBlocked: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	},
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
