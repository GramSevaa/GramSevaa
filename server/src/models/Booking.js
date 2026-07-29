import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null, index: true },
    startAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60, min: 15, max: 480 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending", index: true }
  },
  { timestamps: true }
);

bookingSchema.index({ provider: 1, startAt: 1, status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
