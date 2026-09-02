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
			maxlength: 50,
		},

		lastName: {
			type: String,
			required: true,
			trim: true,
			maxlength: 50,
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
			maxlength: 20,
		},

		password: {
			type: String,
			required: true,
		},

		city: {
			type: String,
			default: "",
			trim: true,
			maxlength: 80,
		},

		bio: {
			type: String,
			default: "",
			trim: true,
			maxlength: 300,
		},

		avatar: {
			type: String,
			default: "",
			trim: true,
		},

		skills: {
			type: [
				{
					type: String,
					trim: true,
					maxlength: 30,
				},
			],
			default: [],
			validate: {
				validator: (skills: string[]) => skills.length <= 10,
				message: "Możesz dodać maksymalnie 10 umiejętności.",
			},
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
