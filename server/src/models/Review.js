import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ provider: 1, resident: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
