import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["review"], required: true, index: true },
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", default: null },
    reviewerName: { type: String, default: "", trim: true },
    rating: { type: Number, default: null, min: 1, max: 5 },
    readAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ provider: 1, createdAt: -1 });
notificationSchema.index({ provider: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
