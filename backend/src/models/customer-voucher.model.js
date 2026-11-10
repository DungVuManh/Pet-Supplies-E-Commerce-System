import mongoose from "mongoose";

const customerVoucherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    collection: "customerVouchers",
    timestamps: true,
    bufferCommands: false,
  }
);

customerVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });
customerVoucherSchema.index({ userId: 1, savedAt: -1 });
customerVoucherSchema.index({ userId: 1, code: 1 });

export const CustomerVoucher =
  mongoose.models.CustomerVoucher ||
  mongoose.model("CustomerVoucher", customerVoucherSchema);

