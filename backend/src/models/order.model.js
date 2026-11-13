import mongoose from "mongoose";
import {
    nonNegativeInteger, shippingAddressSchema, paymentMethods, paymentStatuses, orderStatuses,
} from "./shared.schema.js";

const orderItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variantSku: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        unitPrice: { ...nonNegativeInteger, required: true },
        qty: { ...nonNegativeInteger, min: 1, required: true },
        image: { type: String, trim: true },
    },
    { _id: false },
);
const guestInfoSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    },
    { _id: false },
);
const statusHistorySchema = new mongoose.Schema(
    {
        from: { type: String, enum: orderStatuses },
        to: { type: String, enum: orderStatuses, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorType: { type: String, enum: ["user", "system"] },
        at: { type: Date, default: Date.now, required: true },
    },
    { _id: false },
);

const returnReasons = ["damaged_or_defective", "not_received", "missing_items", "damaged_or_missing"];
export const activeReturnStatuses = ["pending", "approved", "customer_shipped", "received"];
export const returnStatuses = [...activeReturnStatuses, "completed", "rejected", "cancelled"];
const refundStatuses = ["none", "pending_refund", "refunded"];

const returnBankAccountSchema = new mongoose.Schema(
    {
        bankName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        accountNumber: { type: String, required: true, trim: true, minlength: 6, maxlength: 30 },
        accountHolder: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    },
    { _id: false },
);

export const returnRequestSchema = new mongoose.Schema(
    {
        reason: { type: String, enum: returnReasons, required: true },
        bankAccount: { type: returnBankAccountSchema, required: true },
        description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
        images: {
            type: [String],
            default: [],
            validate: [
                { validator: (arr) => Array.isArray(arr) && arr.length <= 5, message: "Maximum 5 images" },
                {
                    validator: (arr) =>
                        arr.every((url) => typeof url === "string" && url.startsWith("https://res.cloudinary.com/")),
                    message: "Return images must be Cloudinary HTTPS URLs",
                },
            ],
        },
        status: { type: String, enum: returnStatuses, required: true },
        refundRequired: { type: Boolean, default: false },
        refundStatus: { type: String, enum: refundStatuses, default: "none" },
        refundAmount: { ...nonNegativeInteger },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        requestedAt: { type: Date, required: true },
        cancelledAt: { type: Date },
        approvedAt: { type: Date },
        customerShippedAt: { type: Date },
        receivedAt: { type: Date },
        completedAt: { type: Date },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
        rejectionReason: { type: String, trim: true, maxlength: 500 },
    },
    { _id: false },
);

const orderSchema = new mongoose.Schema(
    {
        orderCode: { type: String, required: true, trim: true, unique: true, immutable: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        guestInfo: {
            type: guestInfoSchema,
            required() { return !this.customerId && this.channel === "online"; },
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: { validator: (items) => items.length > 0, message: "Order requires items" },
        },
        shippingAddress: {
            type: shippingAddressSchema,
            required() { return this.channel === "online"; },
        },
        subtotal: { ...nonNegativeInteger, required: true },
        shippingFee: { ...nonNegativeInteger, default: 0 },
        discount: { ...nonNegativeInteger, default: 0 },
        total: { ...nonNegativeInteger, required: true },
        paidAmount: { ...nonNegativeInteger, default: 0 },
        needsReview: { type: Boolean, default: false },
        paymentExpiredAt: { type: Date },
        promotionCode: { type: String, trim: true, uppercase: true },
        paymentMethod: { type: String, enum: paymentMethods, required: true },
        paymentStatus: {
            type: String, enum: paymentStatuses,
            default() { return this.paymentMethod === "ONLINE" ? "pending" : "unpaid"; },
        },
        orderStatus: { type: String, enum: orderStatuses, default: "pending" },
        channel: { type: String, enum: ["online", "offline"], default: "online" },
        createdByStaffId: {
            type: mongoose.Schema.Types.ObjectId, ref: "User",
            required() { return this.channel === "offline"; },
        },
        email: { type: String, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        creationRequestId: { type: String, select: false, immutable: true },
        creationRequestHash: { type: String, select: false, immutable: true },
        creationState: { type: String, enum: ["pending", "complete"] },
        shipping: {
            carrier: { type: String, trim: true, maxlength: 100 },
            trackingNumber: { type: String, trim: true, maxlength: 100 },
        },
        statusHistory: { type: [statusHistorySchema], default: [] },
        cancellationReason: { type: String, trim: true, maxlength: 500 },
        cancellationNote: { type: String, trim: true, maxlength: 500 },
        returnRequest: { type: returnRequestSchema },
        latestReturn: {
            requestId: { type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest" },
            status: { type: String, enum: returnStatuses },
            reviewedAt: { type: Date },
        },
        returnOperation: {
            type: new mongoose.Schema({
                id: { type: mongoose.Schema.Types.ObjectId, required: true },
                requestId: { type: mongoose.Schema.Types.ObjectId, required: true },
                fromStatus: { type: String, enum: returnStatuses },
                fields: { type: mongoose.Schema.Types.Mixed, required: true },
                orderFields: mongoose.Schema.Types.Mixed,
                orderHistory: mongoose.Schema.Types.Mixed,
                audit: mongoose.Schema.Types.Mixed,
            }, { _id: false }),
            select: false,
        },
        returnWindowCompletedAt: { type: Date },
    },
    { timestamps: true, bufferCommands: false },
);

orderSchema.pre("validate", function () {
    if (this.paymentMethod === "CASH" && this.channel !== "offline") {
        this.invalidate("paymentMethod", "Cash is only supported for offline orders");
    }
    const subtotal = this.items?.reduce((sum, item) => sum + item?.unitPrice * item?.qty, 0);
    if (this.subtotal !== subtotal) this.invalidate("subtotal", "Subtotal must match item snapshots");
    if (this.discount > this.subtotal) this.invalidate("discount", "Discount exceeds subtotal");
    if (this.total !== this.subtotal - this.discount) {
        this.invalidate("total", "Total must match subtotal, discount and shipping fee");
    }
});
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ createdByStaffId: 1, creationRequestId: 1 }, {
    unique: true,
    partialFilterExpression: { creationRequestId: { $type: "string" } },
});
orderSchema.index({ "returnRequest.status": 1, "returnRequest.requestedAt": -1 });
orderSchema.index({ "returnOperation.id": 1 }, { sparse: true });

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
