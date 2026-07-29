import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true, index: true },
    price: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const Service = mongoose.model("Service", serviceSchema);
