import mongoose from "mongoose";

const adminActionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["delete_review"], required: true, index: true },
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", default: null, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

adminActionSchema.index({ admin: 1, createdAt: -1 });
adminActionSchema.index({ action: 1, createdAt: -1 });

export const AdminAction = mongoose.model("AdminAction", adminActionSchema);
